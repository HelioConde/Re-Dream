extends AnimatedSprite2D

# Load sprites PNG exported by PixelLab automatically. Fallback remains procedural.
var loaded := false
var idle_phase := 0.0

# Motion for the approved single-frame idle until a real Character idle cycle is approved.
# Offset only the sprite; never move the collision body or camera.
func _process(delta: float) -> void:
	if loaded and animation == "idle" and sprite_frames.get_frame_count("idle") == 1:
		idle_phase = fmod(idle_phase + delta * 2.8, TAU)
		offset.y = -0.75 * (1.0 - cos(idle_phase))
	else:
		idle_phase = 0.0
		offset.y = 0.0


func setup(kind: String) -> void:
	idle_phase = 0.0
	offset = Vector2.ZERO
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	centered = true
	# A versão de fantasia usa 128px; ajustar a escala visual, não a hitbox.
	scale = Vector2(0.88, 0.88) if kind == "vanguard" else Vector2.ONE
	position = Vector2(0.0, -15.0) if kind == "vanguard" else Vector2(0.0, -12.0)
	var created := SpriteFrames.new()
	if created.has_animation("default"):
		created.remove_animation("default")
	for action in ["idle", "run", "attack", "heavy", "dash", "skill", "skill_1", "skill_2", "skill_3", "jump", "air_attack", "launcher", "dash_attack", "rocket", "shadow", "otto", "dive", "hit"]:
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
		# Um golpe leve dura 0,31 s no hero.gd. A velocidade antiga de 12 fps
		# exibia só ~4 dos 9 quadros PixelLab antes de voltar a idle.
		# Usar a duração do estado para exibir o ciclo completo sem alterar hitboxes.
		var duration := 0.0
		match action:
			"attack":
				duration = 0.31
			"heavy":
				duration = 0.48
			"launcher":
				duration = 0.42
			"dash_attack":
				duration = 0.35
			"otto":
				duration = 0.27
			"dive":
				duration = 0.43
			"air_attack":
				duration = 0.32
		if duration > 0.0:
			created.set_animation_speed(action, float(textures.size()) / duration)
		else:
			created.set_animation_speed(action, 12.0 if action.begins_with("skill") else 10.0)
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

# Os quatro golpes usam os mesmos frames PixelLab.
# Reiniciar no frame zero mesmo quando "attack" ainda está tocando.
# O quarto golpe tem recovery de 0,39 s; os anteriores, 0,31 s.
func restart_light_attack(duration: float) -> void:
	if not loaded or not sprite_frames.has_animation("attack") or duration <= 0.0:
		return
	speed_scale = 0.31 / duration
	play("attack")
	# play() não reinicia a mesma animação já em execução no Godot.
	set_frame_and_progress(0, 0.0)


func show_state(requested: String, facing: int) -> void:
	if not loaded:
		return
	flip_h = facing < 0
	var state := requested
	if not sprite_frames.has_animation(state):
		if requested.begins_with("skill_") and sprite_frames.has_animation("skill"):
			state = "skill"
		elif requested in ["heavy", "skill", "air_attack", "launcher", "dash_attack", "otto", "dive"] or requested.begins_with("skill_"):
			state = "attack" if sprite_frames.has_animation("attack") else "idle"
		elif requested in ["jump", "dash", "rocket", "shadow"] and sprite_frames.has_animation("run"):
			state = "run"
		else:
			state = "idle"
	if animation != state:
		idle_phase = 0.0
		offset.y = 0.0
		speed_scale = 1.0
		play(state)
	elif not is_playing() and state in ["idle", "run"]:
		play(state)
