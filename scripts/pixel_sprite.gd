extends AnimatedSprite2D

# Load sprites PNG exported by PixelLab automatically. Fallback remains procedural.
var loaded := false

func setup(kind: String) -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	centered = true
	position = Vector2(0.0, -12.0)
	var created := SpriteFrames.new()
	if created.has_animation("default"):
		created.remove_animation("default")
	for action in ["idle", "run", "attack", "heavy", "dash", "skill", "jump", "hit"]:
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

func show_state(requested: String, facing: int) -> void:
	if not loaded:
		return
	flip_h = facing < 0
	var state := requested
	if not sprite_frames.has_animation(state):
		state = "attack" if requested == "heavy" and sprite_frames.has_animation("attack") else "idle"
	if animation != state:
		play(state)
	elif not is_playing() and state in ["idle", "run"]:
		play(state)
