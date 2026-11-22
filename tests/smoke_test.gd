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
	for action in ["move_left", "move_right", "jump", "drop_platform", "attack_light", "attack_heavy", "dash", "skill", "restart"]:
		if not InputMap.has_action(action):
			_fail("Ação de controle ausente: " + action)
			return

	if get_nodes_in_group("one_way_platforms").size() != 5:
		_fail("Esperadas cinco plataformas atravessáveis individualmente.")
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

	# Testa a transição duplo toque -> dash, sem depender da velocidade do runner.
	hero.set("stagger", 0.0)
	hero.set("attack_time", 0.0)
	hero.set("dash_cooldown", 0.0)
	hero.set("dash_time", 0.0)
	hero.call("_register_direction_tap", 1)
	hero.call("_register_direction_tap", 1)
	if float(hero.get("dash_time")) <= 0.0 or not bool(hero.get("sprint_after_dash")):
		_fail("Duplo toque não iniciou dash com corrida contínua.")
		return

	# Buffer permite saltar por uma curta janela após sair da borda.
	hero.set("dash_time", 0.0)
	hero.set("jump_buffer", 0.12)
	hero.set("coyote_time", 0.10)
	if not bool(hero.call("_try_buffered_jump")):
		_fail("Jump buffer e coyote time não ativaram salto.")
		return
	var jump_velocity: Vector2 = hero.get("velocity")
	if jump_velocity.y >= 0.0:
		_fail("Salto amortecido não aplicou velocidade vertical negativa.")
		return

	print("PASS: cena, ondas, colisões, dano, combo, dash duplo toque e salto tolerante.")
	quit(0)

func _fail(reason: String) -> void:
	printerr("FAIL: ", reason)
	quit(1)
