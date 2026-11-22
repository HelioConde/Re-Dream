extends SceneTree

func _initialize() -> void:
	call_deferred("_check_game")

func _check_game() -> void:
	var main_scene := load("res://scenes/Main.tscn") as PackedScene
	if main_scene == null:
		_fail("Cena principal não foi carregada.")
		return
	var arena := main_scene.instantiate()
	root.add_child(arena)
	await process_frame

	var heroes := get_nodes_in_group("player")
	var foes := get_nodes_in_group("enemies")
	if heroes.size() != 1:
		_fail("Esperado exatamente um personagem jogável.")
		return
	if foes.size() != 3:
		_fail("Primeira onda precisa ter três inimigos.")
		return
	for action in ["move_left", "move_right", "jump", "attack_light", "attack_heavy", "dash", "skill", "restart"]:
		if not InputMap.has_action(action):
			_fail("Ação de controle ausente: " + action)
			return

	var hero: Node2D = heroes[0]
	var enemy: Node2D = foes[0]
	var initial_health := int(enemy.get("health"))
	enemy.call("take_hit", 5, Vector2.ZERO)
	if int(enemy.get("health")) != initial_health - 5:
		_fail("Dano ao inimigo não foi aplicado.")
		return
	hero.global_position = enemy.global_position + Vector2(-60, 0)
	hero.set("facing", 1)
	hero.call("_begin_attack", "light")
	hero.call("_resolve_melee")
	if int(enemy.get("health")) >= initial_health - 5:
		_fail("Combo não atingiu o inimigo na frente do herói.")
		return
	hero.call("take_damage", 8, Vector2.ZERO)
	if int(hero.get("health")) != 92:
		_fail("O herói não recebeu dano corretamente.")
		return

	print("PASS: cena, controles, onda, dano, combo e vida.")
	quit(0)

func _fail(reason: String) -> void:
	printerr("FAIL: ", reason)
	quit(1)
