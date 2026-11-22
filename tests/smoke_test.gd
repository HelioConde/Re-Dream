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
	for action in ["move_left", "move_right", "jump", "drop_platform", "attack_light", "launcher_modifier", "charge_skill", "attack_heavy", "dash", "skill", "restart"]:
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

	# Portabilidade do combate: launcher deve jogar inimigos para cima.
	hero.set("attack_time", 0.0)
	hero.set("dash_time", 0.0)
	hero.global_position = foes[1].global_position + Vector2(-72.0, 0.0)
	var target_health := int(foes[1].get("health"))
	hero.call("_begin_attack", "launcher")
	if str(hero.get("attack_kind")) != "launcher":
		_fail("Launcher não entrou no estado de ataque.")
		return
	hero.call("_resolve_melee")
	var launch_velocity: Vector2 = foes[1].get("velocity")
	if int(foes[1].get("health")) >= target_health or launch_velocity.y > -400.0:
		_fail("Launcher não causou dano e impulso vertical.")
		return
	if float(hero.get("chase_window")) <= 0.0:
		_fail("Launcher não habilitou janela de perseguição aérea.")
		return

	# Ataque aéreo deve alcançar um adversário abaixo do herói.
	hero.set("attack_time", 0.0)
	hero.global_position = foes[2].global_position + Vector2(-65.0, -85.0)
	target_health = int(foes[2].get("health"))
	hero.call("_begin_attack", "air")
	hero.call("_resolve_melee")
	if int(foes[2].get("health")) >= target_health:
		_fail("Golpe aéreo não atingiu adversário na vertical.")
		return

	# O ataque durante dash cancela a velocidade do dash e ganha estado específico.
	hero.set("attack_time", 0.0)
	hero.set("dash_time", 0.14)
	hero.call("_begin_attack", "dash_attack")
	if str(hero.get("attack_kind")) != "dash_attack" or float(hero.get("dash_time")) > 0.0:
		_fail("Golpe do dash não cancelou o dash.")
		return

	# Z só ativa especial quando carregado; cooldown e mana são autoritativos.
	hero.set("attack_time", 0.0)
	hero.set("stagger", 0.0)
	hero.set("mana", 100.0)
	hero.set("skill_cooldown", 0.0)
	hero.global_position = Vector2(180.0, 540.0)
	hero.call("_begin_charge")
	hero.set("charge_time", 1.32)
	if not bool(hero.call("_release_charge")) or int(hero.get("last_skill_level")) != 2:
		_fail("Soltar Z carregado não lançou MP2.")
		return
	if absf(float(hero.get("mana")) - 50.0) > 0.01:
		_fail("MP2 não consumiu os 50 pontos de energia previstos.")
		return
	if bool(hero.get("charge_active")) or float(hero.get("charge_time")) != 0.0:
		_fail("Estado da carga não foi limpo após a magia.")
		return
	hero.set("skill_cooldown", 0.0)
	hero.set("mana", 55.0)
	if bool(hero.call("_cast_skill", 3)) or float(hero.get("mana")) != 55.0:
		_fail("MP3 foi executado sem energia suficiente.")
		return

	# O quarto golpe existe, mas a sequência reinicia quando a janela acaba.
	hero.set("combo_step", 0)
	hero.set("combo_window", 0.0)
	for stage in range(1, 5):
		hero.set("attack_time", 0.0)
		hero.set("dash_time", 0.0)
		hero.call("_begin_attack", "light")
		if int(hero.get("combo_step")) != stage:
			_fail("Combo de quatro golpes interrompido no passo %d." % stage)
			return
	hero.set("attack_time", 0.0)
	hero.set("combo_window", 0.0)
	hero.call("_begin_attack", "light")
	if int(hero.get("combo_step")) != 1:
		_fail("Combo não reiniciou após janela encerrada.")
		return

	# Pulo no dash cria Rocket Step, preservando um único impulso horizontal.
	hero.set("attack_time", 0.0)
	hero.set("chase_window", 0.0)
	hero.set("dash_time", 0.14)
	hero.set("jump_buffer", 0.12)
	hero.set("coyote_time", 0.12)
	if not bool(hero.call("_try_buffered_jump")):
		_fail("Rocket Step não iniciou pulo durante dash.")
		return
	var rocket_velocity: Vector2 = hero.get("velocity")
	if float(hero.get("rocket_time")) <= 0.0 or rocket_velocity.y >= -650.0 or float(hero.get("dash_time")) > 0.0:
		_fail("Rocket Step não aplicou velocidade e cancelamento corretos.")
		return

	# ↓ durante Rocket transforma o salto em Shadow Step descendente.
	if not bool(hero.call("_start_shadow_step")):
		_fail("Shadow Step não iniciou durante Rocket.")
		return
	var shadow_velocity: Vector2 = hero.get("velocity")
	if float(hero.get("shadow_time")) <= 0.0 or float(hero.get("rocket_time")) > 0.0 or shadow_velocity.y < 600.0:
		_fail("Shadow Step não converteu impulso vertical.")
		return

	# Launcher confirmado permite um único salto de perseguição mais alto.
	hero.set("shadow_time", 0.0)
	hero.set("chase_window", 0.65)
	hero.set("dash_time", 0.0)
	hero.set("jump_buffer", 0.10)
	hero.set("coyote_time", 0.10)
	if not bool(hero.call("_try_buffered_jump")):
		_fail("Salto de perseguição após launcher bloqueado.")
		return
	var chase_velocity: Vector2 = hero.get("velocity")
	if chase_velocity.y > -735.0 or float(hero.get("chase_window")) > 0.0:
		_fail("Salto de perseguição não consumiu a janela.")
		return

	print("PASS: combo4, launcher, aereo, dash, carga Z, Rocket, Shadow e chase.")
	quit(0)

func _fail(reason: String) -> void:
	printerr("FAIL: ", reason)
	quit(1)
