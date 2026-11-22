extends Node2D

const HERO_SCRIPT = preload("res://scripts/hero.gd")
const FOE_SCRIPT = preload("res://scripts/foe.gd")
const WORLD_WIDTH := 3200.0
const FLOOR_HEIGHT := 620.0

const PLATFORMS := [
	Vector2(520, 505),
	Vector2(1090, 445),
	Vector2(1700, 495),
	Vector2(2350, 430),
	Vector2(2860, 515)
]

var hero
var wave := 0
var enemies_remaining := 0
var score := 0
var between_waves := -1.0
var game_over := false

var health_bar: ProgressBar
var mana_bar: ProgressBar
var experience_bar: ProgressBar
var wave_label: Label
var stats_label: Label
var alert_label: Label

func _ready() -> void:
	_setup_input()
	_create_world()
	_create_hud()
	hero = HERO_SCRIPT.new()
	hero.position = Vector2(180.0, 565.0)
	add_child(hero)
	hero.died.connect(_on_hero_died)
	_spawn_wave()

func _setup_input() -> void:
	_map_keys("move_left", [KEY_A, KEY_LEFT])
	_map_keys("move_right", [KEY_D, KEY_RIGHT])
	_map_keys("jump", [KEY_W, KEY_UP, KEY_SPACE])
	_map_keys("drop_platform", [KEY_S, KEY_DOWN])
	_map_keys("attack_light", [KEY_J])
	_map_keys("attack_heavy", [KEY_K])
	_map_keys("dash", [KEY_SHIFT])
	_map_keys("skill", [KEY_L])
	_map_keys("restart", [KEY_R, KEY_ENTER])

func _map_keys(action: String, codes: Array) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	for code in codes:
		var key_event := InputEventKey.new()
		key_event.physical_keycode = code
		InputMap.action_add_event(action, key_event)

func _create_world() -> void:
	_add_solid(Vector2(1600.0, 670.0), Vector2(WORLD_WIDTH, 100.0), false)
	for point in PLATFORMS:
		_add_solid(point, Vector2(240.0, 24.0), true)

func _add_solid(center: Vector2, size: Vector2, one_way: bool) -> void:
	var body := StaticBody2D.new()
	body.position = center
	if one_way:
		body.add_to_group("one_way_platforms")
	body.collision_layer = 1
	body.collision_mask = 0
	var shape := RectangleShape2D.new()
	shape.size = size
	var collider := CollisionShape2D.new()
	collider.shape = shape
	collider.one_way_collision = one_way
	body.add_child(collider)
	add_child(body)

func _spawn_wave() -> void:
	if game_over:
		return
	wave += 1
	enemies_remaining = mini(2 + wave, 10)
	for i in range(enemies_remaining):
		var foe = FOE_SCRIPT.new()
		foe.configure(wave, i > 0 and i % 5 == 0)
		foe.position = Vector2(720.0 + fmod(float(i) * 232.0 + float(wave % 2) * 90.0, 2300.0), 569.0)
		foe.defeated.connect(_on_enemy_defeated)
		add_child(foe)

func _on_enemy_defeated(points: int) -> void:
	if game_over:
		return
	score += points * 10
	hero.grant_reward(points)
	enemies_remaining = maxi(0, enemies_remaining - 1)
	if enemies_remaining == 0:
		between_waves = 2.7

func _on_hero_died() -> void:
	game_over = true
	between_waves = -1.0
	alert_label.text = "FIM DE JOGO  |  Pressione R ou Enter para recomeçar"

func _process(delta: float) -> void:
	if hero == null:
		return
	health_bar.max_value = hero.max_health
	health_bar.value = hero.health
	mana_bar.max_value = hero.max_mana
	mana_bar.value = hero.mana
	experience_bar.max_value = hero.experience_needed
	experience_bar.value = hero.experience
	wave_label.text = "ONDA %02d  |  INIMIGOS %d" % [wave, enemies_remaining]
	stats_label.text = "NÍVEL %d    PONTOS %06d    ESQUIVA %s    ESPECIAL %s" % [
		hero.level, score,
		"OK" if hero.dash_cooldown <= 0.0 else "%.1fs" % hero.dash_cooldown,
		"OK" if hero.skill_cooldown <= 0.0 else "%.1fs" % hero.skill_cooldown
	]
	if game_over:
		if Input.is_action_just_pressed("restart"):
			get_tree().reload_current_scene()
		return
	if between_waves >= 0.0:
		between_waves -= delta
		alert_label.text = "ÁREA LIBERADA!  Próxima onda em %d..." % maxi(1, int(ceil(between_waves)))
		if between_waves < 0.0:
			_spawn_wave()
	else:
		alert_label.text = "DERROTE TODOS OS INIMIGOS PARA AVANÇAR"

func _create_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	health_bar = _add_bar(layer, Vector2(130, 38), Color("#e8556b"))
	mana_bar = _add_bar(layer, Vector2(130, 66), Color("#4fbbff"))
	experience_bar = _add_bar(layer, Vector2(130, 94), Color("#e6c76c"))
	_add_label(layer, Vector2(18, 12), "ECLIPSE VANGUARD", 24, Color("#f8e6bb"))
	_add_label(layer, Vector2(20, 38), "VIDA", 17, Color.WHITE)
	_add_label(layer, Vector2(20, 66), "ENERGIA", 17, Color.WHITE)
	_add_label(layer, Vector2(20, 94), "EXP", 17, Color.WHITE)
	wave_label = _add_label(layer, Vector2(805, 18), "", 22, Color("#ffe5a2"))
	stats_label = _add_label(layer, Vector2(18, 125), "", 14, Color("#deedf7"))
	alert_label = _add_label(layer, Vector2(270, 185), "", 25, Color("#ffe9c0"))
	alert_label.size = Vector2(740, 50)
	alert_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_add_label(layer, Vector2(18, 667), "A/D: MOVER/2x DASH+CORRIDA   ESPAÇO: PULAR   S: DESCER   J: COMBO   K: FORTE   SHIFT: DASH   L: ESPECIAL", 18, Color("#ffffff"))

func _add_label(layer: CanvasLayer, pos: Vector2, value: String, font_size: int, color: Color) -> Label:
	var result := Label.new()
	result.position = pos
	result.text = value
	result.add_theme_font_size_override("font_size", font_size)
	result.add_theme_color_override("font_color", color)
	result.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(result)
	return result

func _add_bar(layer: CanvasLayer, pos: Vector2, fill_color: Color) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.position = pos
	bar.size = Vector2(255, 17)
	bar.show_percentage = false
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var fill := StyleBoxFlat.new()
	fill.bg_color = fill_color
	fill.set_corner_radius_all(4)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color("#171d32")
	bg.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("fill", fill)
	bar.add_theme_stylebox_override("background", bg)
	layer.add_child(bar)
	return bar

func _draw() -> void:
	draw_rect(Rect2(0, 0, WORLD_WIDTH, 720), Color("#172541"))
	draw_rect(Rect2(0, 250, WORLD_WIDTH, 380), Color("#28365a"))
	for i in range(14):
		var cx := 90.0 + float(i) * 250.0
		draw_circle(Vector2(cx, 110.0 + float(i % 3) * 24.0), 42.0, Color("#34466a"))
		draw_colored_polygon(PackedVector2Array([
			Vector2(cx - 245, 570), Vector2(cx, 245 + float(i % 3) * 24),
			Vector2(cx + 240, 570)
		]), Color("#243651"))
	for i in range(23):
		var px := float(i) * 150.0
		draw_rect(Rect2(px, 420, 12, 200), Color("#304565"))
		draw_rect(Rect2(px - 15, 420, 44, 13), Color("#415a7a"))
	draw_rect(Rect2(0, FLOOR_HEIGHT, WORLD_WIDTH, 100), Color("#222f46"))
	draw_rect(Rect2(0, FLOOR_HEIGHT, WORLD_WIDTH, 13), Color("#6d7180"))
	for point in PLATFORMS:
		draw_rect(Rect2(point.x - 120, point.y - 12, 240, 24), Color("#364965"))
		draw_rect(Rect2(point.x - 120, point.y - 12, 240, 8), Color("#a2a0a6"))
		draw_rect(Rect2(point.x - 110, point.y + 12, 20, 18), Color("#4c5870"))
		draw_rect(Rect2(point.x + 90, point.y + 12, 20, 18), Color("#4c5870"))
	for i in range(21):
		draw_circle(Vector2(float(i) * 159.0 + 44.0, 607.0), 3.0, Color("#d5bb7e"))
