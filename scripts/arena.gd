extends Node2D

const HERO_SCRIPT = preload("res://scripts/hero.gd")
const FOE_SCRIPT = preload("res://scripts/foe.gd")
const TOUCH_CONTROLS = preload("res://scripts/touch_controls.gd")
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
var charge_label: Label

func _ready() -> void:
	_setup_input()
	_create_world()
	_create_hud()
	var touch_controls := TOUCH_CONTROLS.new()
	touch_controls.name = "TouchControls"
	add_child(touch_controls)
	hero = HERO_SCRIPT.new()
	hero.position = Vector2(180.0, 565.0)
	add_child(hero)
	hero.died.connect(_on_hero_died)
	_spawn_wave()

func _setup_input() -> void:
	_map_keys("move_left", [KEY_A, KEY_LEFT])
	_map_keys("move_right", [KEY_D, KEY_RIGHT])
	# Modo Praticar original: setas, W, J e Z são os comandos principais.
	_map_keys("jump", [KEY_W, KEY_UP])
	_map_keys("drop_platform", [KEY_S, KEY_DOWN])
	_map_keys("drop_confirm", [KEY_SPACE])
	_map_keys("attack_light", [KEY_J])
	_map_keys("launcher_modifier", [KEY_W, KEY_UP])
	_map_keys("charge_skill", [KEY_Z])
	# Atalhos adicionais da versão Godot e multiplayer antigo.
	_map_keys("attack_heavy", [KEY_H])
	_map_keys("dash", [KEY_SHIFT])
	_map_keys("skill", [KEY_K, KEY_X, KEY_L])
	_map_keys("restart", [KEY_R, KEY_ENTER])

func _map_keys(action: String, codes: Array) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	for code in codes:
		var already_bound := false
		for event in InputMap.action_get_events(action):
			if event is InputEventKey and event.physical_keycode == code:
				already_bound = true
				break
		if not already_bound:
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
	charge_label.text = ("Z CARGA MP%d/3 — SOLTE PARA LANÇAR" % hero._charge_level()) if hero.charge_active else ("AIR JUGGLE x%d   S+Z/J NO AR: ESTOCADA" % hero.air_juggle_chain if hero.air_juggle_chain > 0 else "W+Z/J LANÇADOR | S+Z/J ESTOCADA | S+Z/J NA BORDA OTTO | DASH+W ROCKET")
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
	charge_label = _add_label(layer, Vector2(18, 151), "", 14, Color("#ccf7e7"))
	alert_label = _add_label(layer, Vector2(270, 185), "", 25, Color("#ffe9c0"))
	alert_label.size = Vector2(740, 50)
	alert_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_add_label(layer, Vector2(18, 667), "A/D: ANDAR/2x DASH   W: PULAR   S: DESCER   J: COMBO   Z: ATAQUE/CARGA MP   K/X: SKILL", 18, Color("#ffffff"))

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
	# Bosque de Cristal: camada visual independente da física das plataformas.
	# Céu luminoso em faixas sutis, sem texturas externas ou referência a outros jogos.
	for band in range(18):
		var t := float(band) / 17.0
		var shade := Color("#4261a1").lerp(Color("#a5cfdc"), t)
		draw_rect(Rect2(0.0, float(band) * 37.0, WORLD_WIDTH, 38.0), shade)
	# O sol de cristal e os arcos celestes lembram um mundo de exploração e magia.
	draw_circle(Vector2(980, 119), 102.0, Color(1.0, 0.92, 0.77, 0.17))
	draw_circle(Vector2(980, 119), 61.0, Color("#ffefce"))
	draw_circle(Vector2(980, 119), 46.0, Color("#fff9e8"))
	draw_arc(Vector2(980, 119), 124.0, -0.18, 4.95, 80, Color(0.92, 0.85, 1.0, 0.35), 3.0, true)
	# Montanhas azul-lavanda em planos diferentes dão profundidade sem mover colisões.
	for i in range(15):
		var peak_x := float(i) * 245.0 - 100.0
		var peak_y := 248.0 + float(i % 4) * 25.0
		draw_colored_polygon(PackedVector2Array([
			Vector2(peak_x - 240.0, 548.0), Vector2(peak_x, peak_y),
			Vector2(peak_x + 250.0, 548.0)
		]), Color("#7187b1"))
		draw_colored_polygon(PackedVector2Array([
			Vector2(peak_x - 62.0, peak_y + 77.0), Vector2(peak_x, peak_y),
			Vector2(peak_x + 80.0, peak_y + 82.0), Vector2(peak_x + 17.0, peak_y + 57.0)
		]), Color("#dce3eb"))
	for i in range(12):
		var hill_x := float(i) * 310.0 - 160.0
		var hill_height := 438.0 + float(i % 3) * 22.0
		draw_colored_polygon(PackedVector2Array([
			Vector2(hill_x - 275.0, 625.0), Vector2(hill_x, hill_height),
			Vector2(hill_x + 300.0, 625.0)
		]), Color("#5c9b97"))
	# Floresta encantada: troncos, folhagens em tons esmeralda e flores coral.
	for i in range(19):
		var tree_x := 70.0 + float(i) * 182.0
		var tree_y := 445.0 + float(i % 4) * 22.0
		draw_line(Vector2(tree_x, 608.0), Vector2(tree_x + 6.0, tree_y),
			Color("#685a70"), 15.0)
		draw_circle(Vector2(tree_x - 25.0, tree_y - 22.0), 45.0, Color("#377c78"))
		draw_circle(Vector2(tree_x + 20.0, tree_y - 25.0), 51.0, Color("#2d796e"))
		draw_circle(Vector2(tree_x, tree_y - 58.0), 49.0, Color("#4da78e"))
		draw_circle(Vector2(tree_x - 27.0, tree_y - 54.0), 20.0,
			Color(0.73, 0.94, 0.72, 0.42))
		if i % 3 == 0:
			draw_circle(Vector2(tree_x + 24.0, tree_y - 61.0), 11.0, Color("#fca5b5"))
			draw_circle(Vector2(tree_x + 8.0, tree_y - 78.0), 8.0, Color("#ffd0bf"))
	# Chão com gramado e pedras de brilho mágico.
	draw_rect(Rect2(0.0, FLOOR_HEIGHT, WORLD_WIDTH, 100.0), Color("#344f63"))
	draw_rect(Rect2(0.0, FLOOR_HEIGHT, WORLD_WIDTH, 13.0), Color("#8bd7aa"))
	draw_rect(Rect2(0.0, FLOOR_HEIGHT + 13.0, WORLD_WIDTH, 7.0), Color("#497d70"))
	for i in range(45):
		var grass_x := float(i) * 73.0 + 19.0
		draw_circle(Vector2(grass_x, FLOOR_HEIGHT + 2.0), 4.0, Color("#b0efc0"))
		if i % 4 == 0:
			draw_circle(Vector2(grass_x + 12.0, FLOOR_HEIGHT - 9.0), 4.0, Color("#ff92b5"))
	# Pedras antigas cobertas por grama: colididores permanecem exatamente onde estão.
	for point in PLATFORMS:
		draw_rect(Rect2(point.x - 120.0, point.y - 12.0, 240.0, 24.0), Color("#4b6277"))
		draw_rect(Rect2(point.x - 120.0, point.y - 13.0, 240.0, 9.0), Color("#8ddca7"))
		draw_rect(Rect2(point.x - 112.0, point.y + 12.0, 22.0, 18.0), Color("#647b82"))
		draw_rect(Rect2(point.x + 91.0, point.y + 12.0, 22.0, 18.0), Color("#647b82"))
		draw_line(Vector2(point.x - 50.0, point.y + 11.0),
			Vector2(point.x - 43.0, point.y + 31.0), Color("#4ea98e"), 3.0)
		draw_line(Vector2(point.x + 62.0, point.y + 11.0),
			Vector2(point.x + 50.0, point.y + 25.0), Color("#4ea98e"), 3.0)
		draw_circle(Vector2(point.x - 96.0, point.y - 16.0), 4.0, Color("#ffe0a3"))
	# Cristais e pequenas luzes criam pontos de interesse para exploração.
	for i in range(14):
		var crystal_x := 150.0 + float(i) * 225.0
		var cy := FLOOR_HEIGHT - 11.0
		var crystal_tint := Color("#74e3e6") if i % 2 == 0 else Color("#f6b5ef")
		draw_colored_polygon(PackedVector2Array([
			Vector2(crystal_x - 8.0, cy), Vector2(crystal_x, cy - 30.0),
			Vector2(crystal_x + 11.0, cy - 4.0), Vector2(crystal_x + 2.0, cy + 4.0)
		]), crystal_tint)
		draw_circle(Vector2(crystal_x, cy - 32.0), 14.0,
			Color(0.57, 0.98, 0.97, 0.14))
	for i in range(31):
		var wisp_x := 40.0 + float(i) * 102.0
		var wisp_y := 220.0 + float((i * 17) % 245)
		draw_circle(Vector2(wisp_x, wisp_y), 2.4, Color(0.96, 0.98, 0.76, 0.66))
