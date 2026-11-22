extends CharacterBody2D

signal defeated(experience_points: int)

const GRAVITY := 1350.0
const MAX_AIR_JUGGLE := 3
const PIXEL_SPRITE = preload("res://scripts/pixel_sprite.gd")

var wave_level := 1
var elite := false
var max_health := 52
var health := 52
var damage := 9
var speed := 105.0
var facing := -1
var alive := true
var cooldown := 0.75
var windup := 0.0
var stagger := 0.0
var air_juggle_hits := 0
var animation_clock := 0.0
var pixel_sprite: Node2D

func configure(wave: int, is_elite: bool) -> void:
	wave_level = wave
	elite = is_elite
	max_health = 42 + 15 * wave_level + (65 if elite else 0)
	health = max_health
	damage = 7 + 2 * wave_level + (5 if elite else 0)
	speed = 100.0 + 5.0 * float(wave_level) + (22.0 if elite else 0.0)

func _ready() -> void:
	add_to_group("enemies")
	collision_layer = 4
	collision_mask = 1
	var shape := CapsuleShape2D.new()
	shape.radius = 15.0 if not elite else 19.0
	shape.height = 56.0 if not elite else 69.0
	var collider := CollisionShape2D.new()
	collider.shape = shape
	add_child(collider)
	pixel_sprite = PIXEL_SPRITE.new()
	# Prefer magical PixelLab creature when a coherent idle/run/attack set exists.
	# Original raider remains a safe fallback; PNGs are never overwritten.
	pixel_sprite.setup("crystal_imp")
	if not pixel_sprite.has_core_animations():
		pixel_sprite.setup("enemy")
	pixel_sprite.scale = Vector2(1.19, 1.19) if elite else Vector2.ONE
	add_child(pixel_sprite)

func _physics_process(delta: float) -> void:
	if not alive:
		return
	animation_clock += delta
	cooldown = maxf(0.0, cooldown - delta)
	if not is_on_floor():
		velocity.y += GRAVITY * delta

	var hero := get_tree().get_first_node_in_group("player") as Node2D
	if stagger > 0.0:
		stagger -= delta
	elif hero != null and int(hero.get("health")) > 0:
		var offset := hero.global_position - global_position
		if absf(offset.x) > 76.0 and absf(offset.x) < 850.0 and absf(offset.y) < 180.0:
			facing = 1 if offset.x > 0 else -1
			velocity.x = move_toward(velocity.x, float(facing) * speed, 950.0 * delta)
		else:
			velocity.x = move_toward(velocity.x, 0.0, 950.0 * delta)
		if absf(offset.x) < 82.0 and absf(offset.y) < 72.0 and cooldown <= 0.0 and windup <= 0.0:
			facing = 1 if offset.x > 0 else -1
			windup = 0.42
	else:
		velocity.x = move_toward(velocity.x, 0.0, 700.0 * delta)

	if windup > 0.0:
		windup -= delta
		if windup <= 0.0:
			if hero != null and is_instance_valid(hero):
				var difference := hero.global_position - global_position
				if absf(difference.x) < 90.0 and absf(difference.y) < 75.0:
					hero.call("take_damage", damage, Vector2(float(facing) * 230.0, -115.0))
			cooldown = 1.35

	move_and_slide()
	if is_on_floor() and velocity.y >= 0.0:
		air_juggle_hits = 0
	_update_pixel_sprite()
	queue_redraw()

func take_air_juggle_hit(amount: int, impulse: Vector2) -> bool:
	if not alive:
		return false
	var airborne := not is_on_floor() or velocity.y < -70.0
	var can_lift := airborne and air_juggle_hits < MAX_AIR_JUGGLE
	if can_lift:
		air_juggle_hits += 1
	# After three lifts, the same confirmed overlap still deals damage,
	# but cannot indefinitely suspend the enemy in the air.
	var resolved_impulse := Vector2(impulse.x, minf(impulse.y, -340.0) if can_lift else maxf(impulse.y, 155.0))
	take_hit(amount, resolved_impulse)
	return can_lift


func take_hit(amount: int, impulse: Vector2) -> void:
	if not alive:
		return
	health = maxi(0, health - amount)
	if health <= 0:
		alive = false
		remove_from_group("enemies")
		defeated.emit(17 + wave_level * 7 + (30 if elite else 0))
		queue_free()
		return
	stagger = 0.20
	if pixel_sprite != null and pixel_sprite.visible:
		pixel_sprite.call("show_state", "hit", facing)
	windup = 0.0
	velocity = impulse
	queue_redraw()

func _update_pixel_sprite() -> void:
	if pixel_sprite == null or not pixel_sprite.visible:
		return
	var state := "idle"
	if windup > 0.0:
		state = "attack"
	elif stagger > 0.0:
		state = "hit"
	elif absf(velocity.x) > 15.0:
		state = "run"
	pixel_sprite.call("show_state", state, facing)

func _draw() -> void:
	# Visual-only magical forest creature; collision and AI stay unchanged.
	if pixel_sprite != null and pixel_sprite.visible:
		if windup > 0.0:
			draw_arc(Vector2(0, -9), 42.0, -1.8, 1.8, 20, Color("#ffa7d2"), 4.0, true)
		draw_rect(Rect2(-23, -69, 46, 5), Color("#21384c"))
		draw_rect(Rect2(-22, -68, 44.0 * float(health) / float(max_health), 3), Color("#78ecd4"))
		return

	var scale_factor := 1.19 if elite else 1.0
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(scale_factor, scale_factor))
	var stride := sin(animation_clock * 8.0) * 4.0 if absf(velocity.x) > 10.0 else 0.0
	var moss := Color("#6e62b3") if elite else Color("#2b8d79")
	var leaf := Color("#c39ced") if elite else Color("#67cca0")
	var crystal := Color("#f5b9ff") if elite else Color("#8ef5e5")
	var bark := Color("#5b4770") if elite else Color("#4c6b5d")
	# Enchanted aura and falling glitter make the creature read as magical.
	draw_circle(Vector2(0.0, -23.0), 39.0, Color(0.48, 0.92, 0.92, 0.12))
	draw_line(Vector2(-11.0, 2.0), Vector2(-12.0 + stride, 27.0), bark, 9.0, true)
	draw_line(Vector2(11.0, 2.0), Vector2(12.0 - stride, 27.0), bark, 9.0, true)
	# Living root body, leaf tunic, faceted luminous moonstone belly.
	draw_colored_polygon(PackedVector2Array([
		Vector2(-16, -26), Vector2(-23, -5), Vector2(-13, 16),
		Vector2(12, 16), Vector2(23, -5), Vector2(16, -26)
	]), moss)
	draw_colored_polygon(PackedVector2Array([
		Vector2(-19, -6), Vector2(-3, -20), Vector2(20, -6),
		Vector2(6, 19), Vector2(-9, 12)
	]), leaf)
	draw_colored_polygon(PackedVector2Array([
		Vector2(0, -11), Vector2(11, 2), Vector2(0, 13), Vector2(-11, 2)
	]), crystal)
	draw_line(Vector2(0, -10), Vector2(0, 12), Color(0.96, 1.0, 0.96, 0.45), 2.0, true)
	# Ear-like leafy spikes, expressive round face and visible bright eyes.
	draw_colored_polygon(PackedVector2Array([
		Vector2(-13, -41), Vector2(-30, -54), Vector2(-22, -29), Vector2(-9, -28)
	]), leaf)
	draw_colored_polygon(PackedVector2Array([
		Vector2(13, -41), Vector2(29, -54), Vector2(23, -28), Vector2(9, -28)
	]), leaf)
	draw_circle(Vector2(0, -34), 17.0, Color("#adedd1") if not elite else Color("#e3c7f7"))
	draw_circle(Vector2(-6, -35), 4.3, Color("#25475b"))
	draw_circle(Vector2(7, -35), 4.3, Color("#25475b"))
	draw_circle(Vector2(-4.6, -36), 1.3, Color.WHITE)
	draw_circle(Vector2(8.2, -36), 1.3, Color.WHITE)
	draw_arc(Vector2(0, -31), 5.0, 0.15, PI - 0.15, 9, bark, 2.0, true)
	# Two small moon crystals grown instead of a steel helmet.
	draw_colored_polygon(PackedVector2Array([
		Vector2(-8, -48), Vector2(-6, -67), Vector2(1, -54), Vector2(0, -46)
	]), crystal)
	draw_colored_polygon(PackedVector2Array([
		Vector2(4, -48), Vector2(13, -61), Vector2(13, -46), Vector2(8, -43)
	]), crystal)
	# Crystal staff/hand channels a warning arc during wind-up.
	draw_line(Vector2(12 * facing, -13), Vector2(27 * facing, -8), leaf, 7.0, true)
	draw_line(Vector2(27 * facing, -8), Vector2(36 * facing, -30), bark, 5.0, true)
	draw_circle(Vector2(36 * facing, -33), 7.0, crystal)
	if windup > 0.0:
		draw_arc(Vector2(0, -9), 45.0, -1.8, 1.8, 28, Color("#ffd2a6"), 5.0, true)
		draw_circle(Vector2(36 * facing, -33), 13.0, Color(0.9, 0.8, 1.0, 0.26))
	# Existing health bar semantics are preserved.
	draw_rect(Rect2(-23, -74, 46, 5), Color("#21384c"))
	draw_rect(Rect2(-22, -73, 44.0 * float(health) / float(max_health), 3), Color("#78ecd4"))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
