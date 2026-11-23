extends SceneTree

# Regression: after three air lifts, a confirmed hit still damages but
# cannot keep an enemy airborne indefinitely.
func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var script := load("res://scripts/foe.gd")
	if script == null:
		_fail("Enemy script missing")
		return
	var foe: CharacterBody2D = script.new()
	root.add_child(foe)
	await process_frame
	foe.set("health", 200)
	for index in range(3):
		foe.set("velocity", Vector2(0.0, -180.0))
		if not bool(foe.call("take_air_juggle_hit", 5, Vector2(100.0, -400.0))):
			_fail("Lift %d was rejected before the cap" % (index + 1))
			return
	if int(foe.get("air_juggle_hits")) != 3:
		_fail("Air juggle counter did not reach three")
		return
	foe.set("velocity", Vector2(0.0, -180.0))
	var before := int(foe.get("health"))
	if bool(foe.call("take_air_juggle_hit", 5, Vector2(100.0, -400.0))):
		_fail("Fourth air lift bypassed the cap")
		return
	if int(foe.get("health")) != before - 5:
		_fail("Fourth confirmed hit must still deal damage")
		return
	if (foe.get("velocity") as Vector2).y < 155.0:
		_fail("Fourth hit must not relaunch the enemy")
		return
	print("PASS: three-lift cap preserves damage without infinite air juggle")
	quit(0)

func _fail(message: String) -> void:
	push_error(message)
	quit(1)
