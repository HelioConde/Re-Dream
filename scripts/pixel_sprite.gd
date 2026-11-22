extends AnimatedSprite2D

# Load sprites PNG exported by PixelLab automatically. Fallback remains procedural.
var loaded := false

func setup(kind: String) -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	centered = true
	# A versão de fantasia usa 128px; ajustar a escala visual, não a hitbox.
	scale = Vector2(0.88, 0.88) if kind == "vanguard" else Vector2.ONE
	position = Vector2(0.0, -15.0) if kind == "vanguard" else Vector2(0.0, -12.0)
	var created := SpriteFrames.new()
	if created.has_animation("default"):
		created.remove_animation("default")
	for action in ["idle", "run", "attack", "heavy", "dash", "skill", "skill_1", "skill_2", "skill_3", "jump", "air_attack", "launcher", "dash_attack", "hit"]:
		var textures: Array[Texture2D] = []
		for frame_index in range(16):
			var path := "res://assets/pixellab/%s/%s/%03d.png" % [kind, action, frame_index]
			if not ResourceLoader.exists(path, "Texture2D"):
				break
			var image := load(path) as Texture2D
			if image != null:
				textures.append(image)
		if textures.is_empty():
			continue
		created.add_animation(action)
		created.set_animation_loop(action, action in ["idle", "run"])
		created.set_animation_speed(action, 12.0 if action in ["attack", "heavy", "skill"] else 10.0)
		for texture in textures:
			created.add_frame(action, texture)
	sprite_frames = created
	loaded = created.has_animation("idle")
	visible = loaded
	if loaded:
		play("idle")

func has_frames() -> bool:
	return loaded

func has_core_animations() -> bool:
	# Não ativar pacote parcial: idle sozinho congelaria o personagem em combate.
	return loaded and sprite_frames.has_animation("run") and sprite_frames.has_animation("attack")

func show_state(requested: String, facing: int) -> void:
	if not loaded:
		return
	flip_h = facing < 0
	var state := requested
	if not sprite_frames.has_animation(state):
		if requested.begins_with("skill_") and sprite_frames.has_animation("skill"):
			state = "skill"
		elif requested in ["heavy", "skill", "air_attack", "launcher", "dash_attack"] or requested.begins_with("skill_"):
			state = "attack" if sprite_frames.has_animation("attack") else "idle"
		elif requested in ["jump", "dash"] and sprite_frames.has_animation("run"):
			state = "run"
		else:
			state = "idle"
	if animation != state:
		play(state)
	elif not is_playing() and state in ["idle", "run"]:
		play(state)
