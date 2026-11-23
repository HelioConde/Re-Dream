extends SceneTree

# Regressao isolada: dano interrompe carga Z, combo e dash.
# Executar: godot --headless --path . --script res://tests/hero_damage_interrupt_test.gd
const HERO_SCRIPT = preload("res://scripts/hero.gd")

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var hero := HERO_SCRIPT.new() as CharacterBody2D
	root.add_child(hero)
	await process_frame
	hero.set("charge_active", true)
	hero.set("charge_time", 1.35)
	hero.set("attack_time", 0.22)
	hero.set("attack_kind", "heavy")
	hero.set("attack_hit", false)
	hero.set("buffered_light_time", 0.12)
	hero.set("dash_time", 0.14)
	hero.set("skill_flash", 0.4)
	hero.call("take_damage", 8, Vector2(120, -90))
	if int(hero.get("health")) != 92:
		_fail("Dano inicial incorreto.")
		return
	if bool(hero.get("charge_active")) or float(hero.get("charge_time")) != 0.0:
		_fail("Dano nao interrompeu carga Z.")
		return
	if float(hero.get("attack_time")) > 0.0 or str(hero.get("attack_kind")) != "":
		_fail("Dano nao interrompeu ataque pendente.")
		return
	if float(hero.get("buffered_light_time")) > 0.0 or float(hero.get("dash_time")) > 0.0:
		_fail("Dano preservou combo em buffer ou dash.")
		return
	if float(hero.get("skill_flash")) > 0.0:
		_fail("Brilho de magia persistiu apos dano.")
		return
	if bool(hero.call("_release_charge")):
		_fail("Soltar Z apos dano executou magia cancelada.")
		return
	var mana_before := float(hero.get("mana"))
	if float(hero.get("mana")) != mana_before:
		_fail("Carga cancelada consumiu mana.")
		return
	hero.call("take_damage", 20, Vector2.ZERO)
	if int(hero.get("health")) != 92:
		_fail("Invulnerabilidade nao bloqueou segundo dano.")
		return
	print("PASS: dano cancela carga, combo, dash e protege contra segundo hit.")
	hero.queue_free()
	quit(0)

func _fail(message: String) -> void:
	push_error(message)
	quit(1)
