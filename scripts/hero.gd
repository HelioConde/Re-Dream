extends CharacterBody2D

signal died

const RUN_SPEED := 300.0
const JUMP_VELOCITY := -560.0
const GRAVITY := 1350.0
const DASH_SPEED := 820.0
const CHARGE_BAR_SECONDS := 0.65
const MAX_CHARGE_SECONDS := CHARGE_BAR_SECONDS * 3.0
const ROCKET_DURATION := 0.52
const ROCKET_SPEED := 475.0
const CHASE_JUMP_VELOCITY := -760.0
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
# Etapa 3: Rocket/Shadow Step e janela para perseguir um inimigo lançado.
var rocket_time := 0.0
var rocket_direction := 1
var shadow_time := 0.0
var chase_window := 0.0
var jump_buffer := 0.0
var coyote_time := 0.0
var drop_timer := 0.0
var dropped_platform: CollisionObject2D = null
var skill_cooldown := 0.0
var skill_flash := 0.0
var last_skill_level := 1
var charge_active := false
var charge_time := 0.0
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
	rocket_time = maxf(0.0, rocket_time - delta)
	shadow_time = maxf(0.0, shadow_time - delta)
	chase_window = maxf(0.0, chase_window - delta)
	if is_on_floor():
		rocket_time = 0.0
		shadow_time = 0.0
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
			var hit_threshold := 0.13
			if attack_kind == "heavy":
				hit_threshold = 0.21
			elif attack_kind == "light" and combo_step == 4:
				hit_threshold = 0.18
			elif attack_kind == "launcher":
				hit_threshold = 0.19
			if attack_time <= hit_threshold:
				attack_hit = true
				_resolve_melee()
		if attack_time <= 0.0:
			attack_kind = ""

	# Igual ao treino original: Z inicia um golpe e carrega energia enquanto segurado.
	# A soltura invoca MP1/MP2/MP3 uma única vez (sem repetição automática).
	var light_pressed := Input.is_action_just_pressed("attack_light")
	var charge_pressed := Input.is_action_just_pressed("charge_skill")
	if charge_active and Input.is_action_pressed("charge_skill"):
		charge_time = minf(MAX_CHARGE_SECONDS, charge_time + delta)
	if charge_active and Input.is_action_just_released("charge_skill"):
		_release_charge()

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
		# ↑+J lança o alvo, sem transformar o modificador ↑ em um salto acidental.
		var launcher_requested := is_on_floor() and Input.is_action_pressed("launcher_modifier") and (light_pressed or charge_pressed)
		if launcher_requested:
			jump_buffer = 0.0
		var down_pressed := Input.is_action_just_pressed("drop_platform")
		var shadowed := down_pressed and rocket_time > 0.0 and not is_on_floor() and _start_shadow_step()
		var dropped := down_pressed and not shadowed and _try_drop_platform()
		if not dropped and not launcher_requested:
			_try_buffered_jump()
		if light_pressed:
			_begin_attack(_choose_light_attack())
		if charge_pressed:
			_begin_charge()
			_begin_attack(_choose_light_attack())
		if Input.is_action_just_pressed("attack_heavy"):
			_begin_attack("heavy")
		if Input.is_action_just_pressed("skill"):
			_cast_skill(1)
		if Input.is_action_just_pressed("dash"):
			_start_dash(false)

	if dash_time > 0.0:
		dash_time -= delta
		velocity.x = float(facing) * DASH_SPEED
	elif stagger <= 0.0:
		var speed_multiplier := 1.40 if sprint_after_dash else 1.0
		var move_speed := RUN_SPEED * speed_multiplier * (0.46 if attack_time > 0.0 else 1.0)
		velocity.x = move_toward(velocity.x, axis * move_speed, 2250.0 * delta)
	# Rocket ganha breve deslocamento horizontal; Shadow converte o voo em mergulho.
	if rocket_time > 0.0:
		velocity.x = float(rocket_direction) * ROCKET_SPEED
	elif shadow_time > 0.0:
		velocity.x = move_toward(velocity.x, 0.0, 2400.0 * delta)

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
	if chase_window > 0.0:
		# O launcher confirmado habilita uma perseguição vertical mais forte.
		velocity.y = CHASE_JUMP_VELOCITY
		velocity.x = float(facing) * ROCKET_SPEED
		chase_window = 0.0
	elif dash_time > 0.0:
		# Pulo no dash é Rocket Step; não duplica a duração do dash.
		velocity.y = -690.0
		rocket_time = ROCKET_DURATION
		rocket_direction = facing
		dash_time = 0.0
		sprint_after_dash = false
	else:
		velocity.y = JUMP_VELOCITY
	coyote_time = 0.0
	jump_buffer = 0.0
	return true


func _start_shadow_step() -> bool:
	if not alive or rocket_time <= 0.0:
		return false
	rocket_time = 0.0
	shadow_time = 0.32
	velocity.y = maxf(velocity.y, 650.0)
	velocity.x = float(rocket_direction) * 185.0
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


func _choose_light_attack() -> String:
	if is_on_floor() and Input.is_action_pressed("launcher_modifier"):
		return "launcher"
	if dash_time > 0.0 and is_on_floor():
		return "dash_attack"
	if not is_on_floor():
		return "air"
	return "light"


func _begin_attack(kind: String) -> void:
	if kind not in ["light", "heavy", "launcher", "air", "dash_attack"]:
		return
	if not alive or stagger > 0.0 or attack_time > 0.0:
		return
	if dash_time > 0.0 and kind != "dash_attack":
		return
	if kind == "dash_attack":
		# O golpe cancela o dash e não provoca um segundo deslocamento automático.
		dash_time = 0.0
	attack_kind = kind
	attack_hit = false
	if kind == "light":
		combo_step = (combo_step % 4) + 1 if combo_window > 0.0 else 1
		combo_window = 0.83
		attack_time = 0.39 if combo_step == 4 else 0.31
	else:
		combo_step = 0
		combo_window = 0.0
		match kind:
			"heavy":
				attack_time = 0.48
			"launcher":
				attack_time = 0.42
			"dash_attack":
				attack_time = 0.35
			_:
				attack_time = 0.32


func _resolve_melee() -> void:
	var damage := 10 + combo_step * 7 + level * 2
	var reach := 112.0
	var vertical_range := 69.0
	var vertical_impulse := -165.0
	if attack_kind == "light" and combo_step == 4:
		vertical_impulse = -265.0
	match attack_kind:
		"heavy":
			damage = 34 + level * 4
			reach = 137.0
		"launcher":
			damage = 29 + level * 3
			reach = 137.0
			vertical_impulse = -475.0
		"air":
			damage = 22 + level * 4
			reach = 126.0
			vertical_range = 125.0
			vertical_impulse = -210.0
		"dash_attack":
			damage = 28 + level * 4
			reach = 155.0
			vertical_impulse = -230.0
	var hits := 0
	for candidate in get_tree().get_nodes_in_group("enemies"):
		var enemy := candidate as Node2D
		if enemy == null:
			continue
		var offset := enemy.global_position - global_position
		if absf(offset.y) <= vertical_range and offset.x * float(facing) >= -12.0 and offset.x * float(facing) <= reach:
			enemy.call("take_hit", damage, Vector2(float(facing) * 300.0, vertical_impulse))
			hits += 1
	if hits > 0:
		mana = minf(max_mana, mana + 5.0 * float(hits))
		if attack_kind == "launcher":
			chase_window = 0.75


func _begin_charge() -> void:
	if not alive or stagger > 0.0:
		return
	charge_active = true
	charge_time = 0.0


func _charge_level() -> int:
	return mini(3, int(floor((charge_time + 0.000001) / CHARGE_BAR_SECONDS)))


func _release_charge() -> bool:
	if not charge_active:
		return false
	var charged_level := _charge_level()
	charge_active = false
	charge_time = 0.0
	if charged_level > 0:
		return _cast_skill(charged_level)
	return false


func _cast_skill(tier: int = 1) -> bool:
	if tier < 1 or tier > 3 or not alive or stagger > 0.0 or attack_time > 0.0:
		return false
	var cost: float = [0.0, 35.0, 50.0, 70.0][tier]
	if mana < cost or skill_cooldown > 0.0:
		return false
	mana -= cost
	last_skill_level = tier
	skill_cooldown = 6.0 + float(tier - 1) * 0.75
	skill_flash = 0.42 + float(tier - 1) * 0.15
	var radius: float = [0.0, 195.0, 255.0, 325.0][tier]
	var damage: int = [0, 49, 79, 119][tier] + level * 6
	for candidate in get_tree().get_nodes_in_group("enemies"):
		var enemy := candidate as Node2D
		if enemy != null and global_position.distance_to(enemy.global_position) <= radius:
			var direction := signf(enemy.global_position.x - global_position.x)
			enemy.call("take_hit", damage, Vector2(direction * 460.0, -230.0 - float(tier - 1) * 55.0))
	return true

func take_damage(amount: int, impulse: Vector2) -> void:
	if not alive or invulnerability > 0.0:
		return
	health = maxi(0, health - amount)
	invulnerability = 0.85
	stagger = 0.18
	sprint_after_dash = false
	charge_active = false
	charge_time = 0.0
	rocket_time = 0.0
	shadow_time = 0.0
	chase_window = 0.0
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
		state = "skill_%d" % last_skill_level
	elif attack_time > 0.0:
		if attack_kind == "heavy":
			state = "heavy"
		elif attack_kind == "air":
			state = "air_attack"
		else:
			state = attack_kind if attack_kind in ["launcher", "dash_attack"] else "attack"
	elif dash_time > 0.0:
		state = "dash"
	elif shadow_time > 0.0:
		state = "shadow"
	elif rocket_time > 0.0:
		state = "rocket"
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
		if charge_active:
			var charge_radius := 32.0 + float(_charge_level()) * 9.0
			draw_arc(Vector2(0.0, -28.0), charge_radius, 0.0, TAU, 50, Color("#adf5fc"), 3.0, true)
		if attack_time > 0.0:
			var starting_angle := -1.45 if facing > 0 else 1.7
			draw_arc(Vector2(13 * facing, -12), 68.0, starting_angle, starting_angle + 2.2, 22, Color("#7fd8ff"), 7.0, true)
		if skill_flash > 0.0:
			draw_arc(Vector2(0, -7), (125.0 + float(last_skill_level) * 35.0) * (1.0 - skill_flash * 0.5), 0.0, TAU, 50, Color(0.38, 0.84, 1.0, minf(1.0, skill_flash * 1.5)), 8.0, true)
		if dash_time > 0.0:
			draw_line(Vector2(-50 * facing, -5), Vector2(-16 * facing, -5), Color("#7fd8ff"), 9.0)
		if rocket_time > 0.0:
			draw_line(Vector2(-68 * rocket_direction, -23), Vector2(-24 * rocket_direction, -23), Color("#9bf6eb"), 7.0)
		if shadow_time > 0.0:
			draw_arc(Vector2(0, -26), 52.0, 0.0, TAU, 38, Color("#bc8de9"), 4.0, true)
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
	if charge_active:
		draw_arc(Vector2(0.0, -25.0), 32.0 + float(_charge_level()) * 9.0, 0.0, TAU, 48, Color("#adf5fc"), 3.0, true)
	if attack_time > 0.0:
		var angle_start := -1.45 if facing > 0 else 1.7
		draw_arc(Vector2(13 * facing, -12), 68.0, angle_start, angle_start + 2.2, 22, glow, 7.0, true)
	if skill_flash > 0.0:
		draw_arc(Vector2(0, -7), 160.0 * (1.0 - skill_flash * 0.7), 0.0, TAU, 50, Color(0.38, 0.84, 1.0, skill_flash * 1.8), 8.0, true)
	if dash_time > 0.0:
		draw_line(Vector2(-50 * facing, -5), Vector2(-16 * facing, -5), glow, 9.0)
	if rocket_time > 0.0:
		draw_line(Vector2(-68 * rocket_direction, -23), Vector2(-24 * rocket_direction, -23), Color("#9bf6eb"), 7.0)
	if shadow_time > 0.0:
		draw_arc(Vector2(0, -26), 52.0, 0.0, TAU, 38, Color("#bc8de9"), 4.0, true)

func draw_ellipse_shadow() -> void:
	draw_colored_polygon(PackedVector2Array([Vector2(-26, 30), Vector2(-16, 34), Vector2(16, 34), Vector2(26, 30), Vector2(16, 27), Vector2(-16, 27)]), Color(0.04, 0.08, 0.13, 0.35))
