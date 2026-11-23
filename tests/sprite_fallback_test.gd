extends SceneTree

# Teste isolado: estados ainda sem PNG aprovado devem manter o Aren visível.
func _initialize() -> void:
	call_deferred("_check")

func _check() -> void:
	var script := load("res://scripts/pixel_sprite.gd")
	var sprite := AnimatedSprite2D.new()
	sprite.set_script(script)
	root.add_child(sprite)
	sprite.call("setup", "vanguard")
	if not sprite.call("has_core_animations"):
		_fail("Pacote principal PixelLab não carregou.")
		return
	sprite.call("show_state", "dash", -1)
	if not sprite.flip_h:
		_fail("Dash para esquerda perdeu orientação.")
		return
	if not sprite.sprite_frames.has_animation("dash") and sprite.animation != "run":
		_fail("Dash sem quadros aprovados não usou corrida como fallback.")
		return
	sprite.call("show_state", "skill_2", 1)
	if sprite.flip_h:
		_fail("Skill para direita manteve flip horizontal.")
		return
	if not sprite.sprite_frames.has_animation("skill_2") and not sprite.sprite_frames.has_animation("skill") and sprite.animation != "attack":
		_fail("Skill sem PNG aprovado não usou ataque como fallback.")
		return
	sprite.call("show_state", "hit", 1)
	if not sprite.sprite_frames.has_animation("hit") and sprite.animation != "idle":
		_fail("Dano sem PNG aprovado não retornou ao idle seguro.")
		return
	print("PASS: fallback visual do Aren e orientação.")
	quit(0)

func _fail(message: String) -> void:
	push_error(message)
	quit(1)
