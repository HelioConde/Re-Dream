extends SceneTree

# Focused combat regression: damage interrupts Z charge without spending mana.
# Run after Godot editor import:
# godot --headless --path . --script res://tests/charge_interrupt_test.gd

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var hero_script := load("res://scripts/hero.gd")
	if hero_script == null:
		_fail("Hero script missing")
		return
	var hero: CharacterBody2D = hero_script.new()
	root.add_child(hero)
	await process_frame
	var starting_mana := float(hero.get("mana"))
	hero.call("_begin_charge")
	hero.set("charge_time", 1.32)
	if not bool(hero.get("charge_active")):
		_fail("Z charge did not start")
		return
	hero.call("take_damage", 8, Vector2.ZERO)
	if bool(hero.get("charge_active")) or float(hero.get("charge_time")) != 0.0:
		_fail("Taking damage must cancel charge and reset timer")
		return
	if bool(hero.call("_release_charge")):
		_fail("Interrupted charge must not cast a skill")
		return
	if not is_equal_approx(float(hero.get("mana")), starting_mana):
		_fail("Interrupted charge spent mana")
		return
	# Clear the previous hit immunity so the next hit really tests fatal damage.
	hero.set("stagger", 0.0)
	hero.set("invulnerability", 0.0)
	hero.call("_begin_charge")
	if not bool(hero.get("charge_active")):
		_fail("Charging must recover after stagger ends")
		return
	hero.call("take_damage", 1000, Vector2.ZERO)
	if bool(hero.get("alive")) or bool(hero.get("charge_active")):
		_fail("Fatal damage must interrupt charging")
		return
	hero.call("_begin_charge")
	if bool(hero.get("charge_active")):
		_fail("Dead hero must not begin charging")
		return
	print("PASS: charge interruption, mana preservation and death guards")
	quit(0)

func _fail(message: String) -> void:
	push_error(message)
	quit(1)
