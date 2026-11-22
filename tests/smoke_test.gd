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
	for action in ["move_left", "move_right", "jump", "drop_platform", "drop_confirm", "attack_light", "launcher_modifier", "charge_skill", "attack_heavy", "dash", "skill", "restart"]:
		if not InputMap.has_action(action):
			_fail("Ação de controle ausente: " + action)
			return

	# Contrato Re:Dream Praticar: ↑/W salta, setas movem, J e Z atacam;
	# ↓+Espaço é descida adicional, K/X pertence ao modo online antigo.
	var expected: Dictionary = {
		"move_left": [KEY_LEFT, KEY_A],
		"move_right": [KEY_RIGHT, KEY_D],
		"jump": [KEY_UP, KEY_W],
		"drop_platform": [KEY_DOWN, KEY_S],
		"drop_confirm": [KEY_SPACE],
		"attack_light": [KEY_J],
		"charge_skill": [KEY_Z],
		"skill": [KEY_K, KEY_X, KEY_L],
	}
	for action in expected:
		var bound_keys: Array[int] = []
		for event in InputMap.action_get_events(action):
			if event is InputEventKey:
				bound_keys.append(event.physical_keycode)
		for keycode in expected[action]:
			if not bound_keys.has(keycode):
				_fail("Falta botão herdado do Re:Dream: %s (%s)" % [action, keycode])
				return
		if bound_keys.size() != expected[action].size():
			_fail("Botões extras inesperados no comando: " + action)
			return
	if not bool(ProjectSettings.get_setting("input_devices/pointing/emulate_touch_from_mouse", false)):
		_fail("Controles do navegador não aceitam clique do mouse como toque.")
		return
	# Toques usam ações Godot nativas, para permitir combinações e multitouch.
	var touch_layer := arena.get_node_or_null("TouchControls")
	if touch_layer == null:
		_fail("Controles de toque do Re:Dream ausentes.")
		return
	var touch_actions: Array[String] = []
	for node in touch_layer.get_children():
		if node is TouchScreenButton:
			touch_actions.append(str(node.action))
	for action in ["move_left", "move_right", "jump", "drop_platform", "attack_light", "charge_skill"]:
		if not touch_actions.has(action):
			_fail("Botão móvel ausente: " + action)
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


	# Otto só pode ser escolhido nas extremidades de plataformas vazadas.
	if not bool(hero.call("_is_one_way_edge_position", Vector2(610.0, 463.0), Vector2(520.0, 505.0))):
		_fail("O detector de borda não reconheceu a extremidade da plataforma.")
		return
	if bool(hero.call("_is_one_way_edge_position", Vector2(520.0, 463.0), Vector2(520.0, 505.0))):
		_fail("O detector de borda ativou Otto no centro da plataforma.")
		return
	if bool(hero.call("_is_one_way_edge_position", Vector2(610.0, 420.0), Vector2(520.0, 505.0))):
		_fail("O detector de borda ignorou a altura.")
		return

	# Dive atravessa apenas one-ways, nunca altera o chão sólido.
	hero.set("attack_time", 0.0)
	hero.set("dash_time", 0.0)
	hero.set("velocity", Vector2.ZERO)
	hero.call("_begin_attack", "dive")
	if str(hero.get("attack_kind")) != "dive":
		_fail("Estocada ↓+Z/J não ativou o estado de mergulho.")
		return
	var dive_velocity: Vector2 = hero.get("velocity")
	if dive_velocity.y < 819.0:
		_fail("Estocada não iniciou descida acelerada.")
		return
	if (hero.get("dive_platforms") as Array).size() != 5:
		_fail("A estocada não atravessa todas as cinco plataformas one-way.")
		return
	hero.call("_clear_dive_passthrough")
	if (hero.get("dive_platforms") as Array).size() != 0 or float(hero.get("dive_passthrough_time")) != 0.0:
		_fail("Exceções de colisão da estocada não foram liberadas.")
		return

	# Air juggle permite no máximo três novos levantamentos por alvo.
	var juggle_enemy: Node2D = foes[1]
	juggle_enemy.set("velocity", Vector2(0.0, -480.0))
	var health_before_juggle := int(juggle_enemy.get("health"))
	for i in range(5):
		var lifted := bool(juggle_enemy.call("take_air_juggle_hit", 1, Vector2(10.0, -180.0)))
		if lifted != (i < 3):
			_fail("Limite de três levantamentos aéreos não foi respeitado.")
			return
	if int(juggle_enemy.get("air_juggle_hits")) != 3:
		_fail("Contador de juggle do inimigo incorreto.")
		return
	if int(juggle_enemy.get("health")) != health_before_juggle - 5:
		_fail("Acertos após o limite de juggle deixaram de causar dano.")
		return

	print("PASS: Otto edge, dive, one-way cleanup, juggle3, combo4, launcher, Rocket, Shadow e MP.")

	quit(0)

func _fail(reason: String) -> void:
	printerr("FAIL: ", reason)
	quit(1)
