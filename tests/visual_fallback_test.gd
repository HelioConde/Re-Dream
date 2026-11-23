extends SceneTree

# Regression: optional PixelLab hit/dash art must never disable the playable hero.
func _initialize() -> void:
	call_deferred("_verify")

func _verify() -> void:
	var scene := load("res://scenes/Main.tscn") as PackedScene
	if scene == null:
		_fail("Main scene missing")
		return
	var arena := scene.instantiate()
	root.add_child(arena)
	await process_frame
	var heroes := get_nodes_in_group("player")
	if heroes.size() != 1:
		_fail("Expected one playable hero")
		return
	var hero: Node = heroes[0]
	var sprite := hero.get("pixel_sprite") as AnimatedSprite2D
	if sprite == null:
		_fail("PixelLab sprite/fallback missing")
		return
	if not sprite.sprite_frames.has_animation("idle"):
		_fail("Playable idle animation missing")
		return
	for state in ["hit", "dash"]:
		sprite.call("show_state", state, 1)
		if not sprite.visible or sprite.sprite_frames.get_frame_count(sprite.animation) < 1:
			_fail("State %s has no visible fallback" % state)
			return
		if sprite.sprite_frames.get_frame_texture(sprite.animation, 0) == null:
			_fail("State %s has no texture" % state)
			return
	print("PASS: hit/dash retain a visible PixelLab fallback")
	quit(0)

func _fail(message: String) -> void:
	push_error(message)
	quit(1)
