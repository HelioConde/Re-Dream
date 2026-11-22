extends CharacterBody2D

signal died

const RUN_SPEED := 300.0
const JUMP_VELOCITY := -560.0
const GRAVITY := 1350.0
const DASH_SPEED := 820.0
const PIXEL_SPRITE = preload("res://scripts/pixel_sprite.gd")

var max_health := 100
var health := 100
var max_mana := 100.0
var mana := 65.0
var level := 1
var experience := 0
var experience_needed := 60
var facing := 1
var alive := true

var invulnerability := 0.0
var stagger := 0.0
var dash_time := 0.0
var dash_cooldown := 0.0
# Movimento importado da experiência Re:Dream: duplo toque, corrida e jump buffer.
var last_tap_direction := 0
var double_tap_window := 0.0
var sprint_after_dash := false
var jump_buffer := 0.0
var coyote_time := 0.0
var drop_timer := 0.0
var dropped_platform: CollisionObject2D = null
var skill_cooldown := 0.0
var skill_flash := 0.0
var attack_time := 0.0
var attack_kind := ""
var attack_hit := false
var combo_step := 0
var combo_window := 0.0
var run_clock := 0.0
var pixel_sprite: Node2D

func _ready() -> void:
	name = "Hero"
	add_to_group("player")
	collision_layer = 2
	collision_mask = 1
	var shape := CapsuleShape2D.new()
	shape.radius = 15.0
	shape.height = 60.0
	var collider := CollisionShape2D.new()
	collider.shape = shape
	add_child(collider)
	var camera := Camera2D.new()
	camera.limit_left = 0
	camera.limit_right = 3200
	camera.limit_top = 0
	camera.limit_bottom = 720
	camera.position = Vector2(0, -110)
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 6.0
	add_child(camera)
	camera.make_current()
	pixel_sprite = PIXEL_SPRITE.new()
	# Preferir a nova arte anime-fantasia somente após um pacote PixelLab completo.
	pixel_sprite.setup("vanguard")
	if not pixel_sprite.has_core_animations():
		pixel_sprite.setup("hero")
	add_child(pixel_sprite)

func _physics_process(delta: float) -> void:
	invulnerability = maxf(0.0, invulnerability - delta)
	stagger = maxf(0.0, stagger - delta)
	dash_cooldown = maxf(0.0, dash_cooldown - delta)
	skill_cooldown = maxf(0.0, skill_cooldown - delta)
	skill_flash = maxf(0.0, skill_flash - delta)
	combo_window = maxf(0.0, combo_window - delta)
	double_tap_window = maxf(0.0, double_tap_window - delta)
	jump_buffer = maxf(0.0, jump_buffer - delta)
	if is_on_floor() and drop_timer <= 0.0:
		coyote_time = 0.12
	else:
		coyote_time = maxf(0.0, coyote_time - delta)
	if drop_timer > 0.0:
		drop_timer = maxf(0.0, drop_timer - delta)
		if drop_timer == 0.0:
			if is_instance_valid(dropped_platform):
				remove_collision_exception_with(dropped_platform)
			dropped_platform = null
	if Input.is_action_just_pressed("jump"):
		jump_buffer = 0.14
	if not is_on_floor():
		velocity.y += GRAVITY * delta

	if not alive:
		velocity.x = move_toward(velocity.x, 0.0, 900.0 * delta)
		move_and_slide()
		_update_pixel_sprite()
		queue_redraw()
		return

	if attack_time > 0.0:
		attack_time -= delta
		if not attack_hit:
			var hit_threshold := 0.21 if attack_kind == "heavy" else 0.13
			if attack_time <= hit_threshold:
				attack_hit = true
				_resolve_melee()
		if attack_time <= 0.0:
			attack_kind = ""

	var axis := Input.get_axis("move_left", "move_right")
	if Input.is_action_just_pressed("move_left"):
		_register_direction_tap(-1)
	if Input.is_action_just_pressed("move_right"):
		_register_direction_tap(1)
	# Corrida continua após dash duplo toque enquanto a segunda seta estiver segura.
	if absf(axis) < 0.01 or (axis * float(facing) < 0.0):
		sprint_after_dash = false
	if absf(axis) > 0.01 and stagger <= 0.0 and dash_time <= 0.0:
		facing = 1 if axis > 0.0 else -1

	if stagger <= 0.0:
		var dropped := Input.is_action_just_pressed("drop_platform") and _try_drop_platform()
		if not dropped:
			_try_buffered_jump()
		if Input.is_action_just_pressed("attack_light"):
			_begin_attack("light")
		if Input.is_action_just_pressed("attack_heavy"):
			_begin_attack("heavy")
		if Input.is_action_just_pressed("skill"):
			_cast_skill()
		if Input.is_action_just_pressed("dash"):
			_start_dash(false)

	if dash_time > 0.0:
		dash_time -= delta
		velocity.x = float(facing) * DASH_SPEED
	elif stagger <= 0.0:
		var speed_multiplier := 1.40 if sprint_after_dash else 1.0
		var move_speed := RUN_SPEED * speed_multiplier * (0.46 if attack_time > 0.0 else 1.0)
		velocity.x = move_toward(velocity.x, axis * move_speed, 2250.0 * delta)

	move_and_slide()
	position.x = clampf(position.x, 30.0, 3170.0)
	run_clock += delta * absf(velocity.x) / RUN_SPEED
	_update_pixel_sprite()
	queue_redraw()

func _register_direction_tap(direction: int) -> void:
	if direction == last_tap_direction and double_tap_window > 0.0:
		facing = direction
		_start_dash(true)
		last_tap_direction = 0
		double_tap_window = 0.0
	else:
		last_tap_direction = direction
		double_tap_window = 0.27


func _start_dash(keep_running: bool) -> void:
	if not alive or stagger > 0.0 or attack_time > 0.0 or dash_cooldown > 0.0:
		return
	dash_time = 0.16
	dash_cooldown = 0.80
	sprint_after_dash = keep_running


func _try_buffered_jump() -> bool:
	if not alive or stagger > 0.0 or jump_buffer <= 0.0 or coyote_time <= 0.0:
		return false
	velocity.y = JUMP_VELOCITY
	coyote_time = 0.0
	jump_buffer = 0.0
	return true


func _try_drop_platform() -> bool:
	if not is_on_floor() or dropped_platform != null:
		return false
	# Exceção individual: não torna a plataforma atravessável para inimigos.
	for index in range(get_slide_collision_count()):
		var contact := get_slide_collision(index)
		var collider := contact.get_collider()
		if collider is CollisionObject2D and collider.is_in_group("one_way_platforms"):
			dropped_platform = collider as CollisionObject2D
			add_collision_exception_with(dropped_platform)
			drop_timer = 0.36
			velocity.y = 180.0
			coyote_time = 0.0
			jump_buffer = 0.0
			return true
	return false


func _begin_attack(kind: String) -> void:
	if attack_time > 0.0 or dash_time > 0.0:
		return
	attack_kind = kind
	attack_hit = false
	if kind == "light":
		combo_step = (combo_step % 3) + 1 if combo_window > 0.0 else 1
		combo_window = 0.83
		attack_time = 0.31
	else:
		combo_step = 0
		combo_window = 0.0
		attack_time = 0.48

func _resolve_melee() -> void:
	var damage := 34 + level * 4 if attack_kind == "heavy" else 10 + combo_step * 7 + level * 2
	var reach := 137.0 if attack_kind == "heavy" else 112.0
	var hits := 0
	for candidate in get_tree().get_nodes_in_group("enemies"):
		var enemy := candidate as Node2D
		if enemy == null:
			continue
		var offset := enemy.global_position - global_position
		if absf(offset.y) <= 69.0 and offset.x * float(facing) >= -12.0 and offset.x * float(facing) <= reach:
			enemy.call("take_hit", damage, Vector2(float(facing) * 300.0, -165.0))
			hits += 1
	if hits > 0:
		mana = minf(max_mana, mana + 5.0 * float(hits))

func _cast_skill() -> void:
	if attack_time > 0.0 or mana < 35.0 or skill_cooldown > 0.0:
		return
	mana -= 35.0
	skill_cooldown = 6.0
	skill_flash = 0.42
	for candidate in get_tree().get_nodes_in_group("enemies"):
		var enemy := candidate as Node2D
		if enemy != null and global_position.distance_to(enemy.global_position) <= 195.0:
			var direction := signf(enemy.global_position.x - global_position.x)
			enemy.call("take_hit", 49 + level * 6, Vector2(direction * 460.0, -230.0))

func take_damage(amount: int, impulse: Vector2) -> void:
	if not alive or invulnerability > 0.0:
		return
	health = maxi(0, health - amount)
	invulnerability = 0.85
	stagger = 0.18
	sprint_after_dash = false
	velocity = impulse
	if health == 0:
		alive = false
		died.emit()

func grant_reward(points: int) -> void:
	if not alive:
		return
	experience += points
	mana = minf(max_mana, mana + 9.0)
	while experience >= experience_needed:
		experience -= experience_needed
		level += 1
		experience_needed = int(ceil(float(experience_needed) * 1.35))
		max_health += 12
		health = mini(max_health, health + 28)
		mana = minf(max_mana, mana + 20.0)

func _update_pixel_sprite() -> void:
	if pixel_sprite == null or not pixel_sprite.visible:
		return
	var state := "idle"
	if not alive:
		state = "hit"
	elif skill_flash > 0.0:
		state = "skill"
	elif attack_time > 0.0:
		state = "heavy" if attack_kind == "heavy" else "attack"
	elif dash_time > 0.0:
		state = "dash"
	elif not is_on_floor():
		state = "jump"
	elif absf(velocity.x) > 18.0:
		state = "run"
	pixel_sprite.call("show_state", state, facing)
	pixel_sprite.modulate.a = 0.42 if invulnerability > 0.0 and int(invulnerability * 16.0) % 2 == 0 else 1.0

func _draw() -> void:
	if pixel_sprite != null and pixel_sprite.visible:
		# Luz arcana discreta atrás do herói. O dano e a colisão não são alterados.
		draw_circle(Vector2(0.0, -22.0), 44.0, Color(0.36, 0.91, 0.93, 0.10))
		draw_arc(Vector2(0.0, -25.0), 42.0, -0.5, 4.8, 35, Color(0.78, 0.98, 0.95, 0.30), 2.0, true)
		draw_ellipse_shadow()
		if attack_time > 0.0:
			var starting_angle := -1.45 if facing > 0 else 1.7
			draw_arc(Vector2(13 * facing, -12), 68.0, starting_angle, starting_angle + 2.2, 22, Color("#7fd8ff"), 7.0, true)
		if skill_flash > 0.0:
			draw_arc(Vector2(0, -7), 160.0 * (1.0 - skill_flash * 0.7), 0.0, TAU, 50, Color(0.38, 0.84, 1.0, skill_flash * 1.8), 8.0, true)
		if dash_time > 0.0:
			draw_line(Vector2(-50 * facing, -5), Vector2(-16 * facing, -5), Color("#7fd8ff"), 9.0)
		return

	var cape := Color("#713ec5")
	var armor := Color("#2a4f8f")
	var glow := Color("#7fd8ff")
	var skin := Color("#f5c7ab")
	if invulnerability > 0.0 and int(invulnerability * 16.0) % 2 == 0:
		armor.a = 0.40
		cape.a = 0.40
	draw_ellipse_shadow()
	draw_colored_polygon(PackedVector2Array([Vector2(-7, -13), Vector2(-25, 20), Vector2(9, 23), Vector2(12, -13)]), cape)
	var stride := sin(run_clock * 9.0) * 6.0 if is_on_floor() and absf(velocity.x) > 25.0 else 0.0
	draw_line(Vector2(-7, 9), Vector2(-8 + stride, 28), Color("#19273e"), 8.0)
	draw_line(Vector2(7, 9), Vector2(9 - stride, 28), Color("#19273e"), 8.0)
	draw_rect(Rect2(-13, -20, 26, 32), armor)
	draw_rect(Rect2(-10, -16, 20, 5), Color("#c7bd76"))
	draw_circle(Vector2(0, -35), 14.0, skin)
	draw_colored_polygon(PackedVector2Array([Vector2(-15, -37), Vector2(-10, -53), Vector2(7, -53), Vector2(16, -41), Vector2(8, -46), Vector2(-11, -41)]), Color("#24304c"))
	draw_circle(Vector2(float(facing) * 6.0, -35.0), 2.1, Color("#19273e"))
	draw_line(Vector2(0, -12), Vector2(18 * facing, -5), skin, 7.0)
	var blade_end := Vector2(56 * facing, -31) if attack_time > 0.0 else Vector2(32 * facing, -43)
	draw_line(Vector2(19 * facing, -6), blade_end, Color("#d8ecf9"), 6.0)
	draw_line(Vector2(14 * facing, -10), Vector2(26 * facing, -3), Color("#e9bb59"), 5.0)
	if attack_time > 0.0:
		var angle_start := -1.45 if facing > 0 else 1.7
		draw_arc(Vector2(13 * facing, -12), 68.0, angle_start, angle_start + 2.2, 22, glow, 7.0, true)
	if skill_flash > 0.0:
		draw_arc(Vector2(0, -7), 160.0 * (1.0 - skill_flash * 0.7), 0.0, TAU, 50, Color(0.38, 0.84, 1.0, skill_flash * 1.8), 8.0, true)
	if dash_time > 0.0:
		draw_line(Vector2(-50 * facing, -5), Vector2(-16 * facing, -5), glow, 9.0)

func draw_ellipse_shadow() -> void:
	draw_colored_polygon(PackedVector2Array([Vector2(-26, 30), Vector2(-16, 34), Vector2(16, 34), Vector2(26, 30), Vector2(16, 27), Vector2(-16, 27)]), Color(0.04, 0.08, 0.13, 0.35))
