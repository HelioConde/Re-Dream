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
	if pixel_sprite != null and pixel_sprite.visible:
		if windup > 0.0:
			draw_arc(Vector2(0, -9), 42.0, -1.8, 1.8, 20, Color("#ff716e"), 4.0)
		draw_rect(Rect2(-23, -69, 46, 5), Color("#292b3c"))
		draw_rect(Rect2(-22, -68, 44.0 * float(health) / float(max_health), 3), Color("#f16c78"))
		return

	var scale_factor := 1.19 if elite else 1.0
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(scale_factor, scale_factor))
	var stride := sin(animation_clock * 8.0) * 3.0 if absf(velocity.x) > 10.0 else 0.0
	var body_color := Color("#9f4562") if elite else Color("#526d79")
	draw_line(Vector2(-7, 5), Vector2(-8 + stride, 26), Color("#283343"), 7.0)
	draw_line(Vector2(7, 5), Vector2(8 - stride, 26), Color("#283343"), 7.0)
	draw_rect(Rect2(-16, -22, 32, 34), body_color)
	draw_circle(Vector2(0, -35), 15.0, Color("#d6bea1"))
	draw_colored_polygon(PackedVector2Array([Vector2(-17, -41), Vector2(-12, -56), Vector2(0, -48), Vector2(12, -56), Vector2(17, -41)]), Color("#414359"))
	draw_circle(Vector2(6 * facing, -36), 2.3, Color("#fe7e70"))
	draw_line(Vector2(10 * facing, -13), Vector2(25 * facing, -1), Color("#d6bea1"), 7.0)
	draw_line(Vector2(23 * facing, -2), Vector2(38 * facing, -18), Color("#e9dca5"), 6.0)
	if windup > 0.0:
		draw_arc(Vector2(0, -9), 42.0, -1.8, 1.8, 20, Color("#ff716e"), 4.0)
	draw_rect(Rect2(-23, -69, 46, 5), Color("#292b3c"))
	draw_rect(Rect2(-22, -68, 44.0 * float(health) / float(max_health), 3), Color("#f16c78"))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
