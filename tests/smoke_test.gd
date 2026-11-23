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
	# Cada botão clássico deve existir exatamente uma vez: duplicações causam
	# sobreposição visual e podem mascarar um comando ausente no mobile.
	if touch_actions.size() != 6:
		_fail("Esperados exatamente seis botões móveis do Re:Dream.")
		return
	for action in ["move_left", "move_right", "jump", "drop_platform", "attack_light", "charge_skill"]:
		if touch_actions.count(action) != 1:
			_fail("Botão móvel ausente ou duplicado: " + action)
			return

	if get_nodes_in_group("one_way_platforms").size() != 5:
		_fail("Esperadas cinco plataformas atravessáveis individualmente.")
		return

	var hero: Node2D = heroes[0]
	# Quando o núcleo V2 existe, o Godot deve realmente usar o sprite mágico.
	if ResourceLoader.exists("res://assets/pixellab/vanguard/idle/000.png", "Texture2D"):
		var hero_sprite := hero.get("pixel_sprite") as AnimatedSprite2D
		if hero_sprite == null or not bool(hero_sprite.call("has_core_animations")) or not hero_sprite.visible:
			_fail("Vanguard V2 completo não foi ativado no protagonista.")
			return
		if not is_equal_approx(hero_sprite.scale.x, 0.88):
			_fail("Escala do sprite mágico não foi aplicada corretamente.")
			return
		var frame_texture := hero_sprite.sprite_frames.get_frame_texture("idle", 0)
		if frame_texture == null or frame_texture.get_width() != 128 or frame_texture.get_height() != 128:
			_fail("Textura mestre do protagonista não tem 128x128.")
			return
	# The managed PixelLab Character jump must actually be selected by Godot.
	if ResourceLoader.exists("res://assets/pixellab/vanguard/jump/000.png", "Texture2D"):
		var character_sprite := hero.get("pixel_sprite") as AnimatedSprite2D
		if character_sprite == null or not character_sprite.sprite_frames.has_animation("jump"):
			_fail("Character jump sprites are present but not loaded by the Godot hero.")
			return
		if character_sprite.sprite_frames.get_frame_count("jump") != 9:
			_fail("Character jump must have all nine approved frames.")
			return
		var jump_texture := character_sprite.sprite_frames.get_frame_texture("jump", 4)
		if jump_texture == null or jump_texture.get_width() != 188 or jump_texture.get_height() != 188:
			_fail("Managed Character jump has unexpected canvas dimensions.")
			return
		character_sprite.call("show_state", "jump", 1)
		if character_sprite.animation != "jump":
			_fail("Jump state does not select managed PixelLab Character animation.")
			return
	# A animação PixelLab de ataque deve exibir todos os frames antes do
	# término dos 310 ms do golpe leve; antes só ~4/9 apareciam a 12 fps.
	var timing_sprite := hero.get("pixel_sprite") as AnimatedSprite2D
	if timing_sprite != null and timing_sprite.sprite_frames.has_animation("attack"):
		var attack_frames := timing_sprite.sprite_frames.get_frame_count("attack")
		var attack_fps := timing_sprite.sprite_frames.get_animation_speed("attack")
		if attack_frames <= 0 or not is_equal_approx(float(attack_frames) / attack_fps, 0.31):
			_fail("Animação PixelLab de ataque não acompanha os 310 ms do golpe leve.")
			return
		# Também proteger a duração visual dos outros golpes se houver PNGs.
		var action_durations := {"heavy": 0.48, "launcher": 0.42, "dash_attack": 0.35, "otto": 0.27, "dive": 0.43, "air_attack": 0.32}
		for action in action_durations:
			if timing_sprite.sprite_frames.has_animation(action):
				var frames := timing_sprite.sprite_frames.get_frame_count(action)
				var fps := timing_sprite.sprite_frames.get_animation_speed(action)
				if frames <= 0 or not is_equal_approx(float(frames) / fps, float(action_durations[action])):
					_fail("Duração visual incorreta do golpe: " + action)
					return
	var enemy: Node2D = foes[0]
	var initial_health := int(enemy.get("health"))
	enemy.call("take_hit", 5, Vector2.ZERO)
	if int(enemy.get("health")) != initial_health - 5:
		_fail("Dano ao inimigo não foi aplicado.")
		return
	# O impacto mágico deve ser imediato e cessar após a janela curta, com
	# sprites PixelLab ou desenho procedural, sem alterar dano ou física.
	if float(enemy.get("hit_flash")) <= 0.0:
		_fail("Crystal Imp não iniciou o realce mágico após receber dano.")
		return
	var impact_sprite := enemy.get("pixel_sprite") as CanvasItem
	if impact_sprite != null and impact_sprite.visible and impact_sprite.modulate == Color.WHITE:
		_fail("Sprite PixelLab não recebeu realce de impacto.")
		return
	enemy.call("_physics_process", 0.15)
	if float(enemy.get("hit_flash")) > 0.001:
		_fail("Realce mágico do inimigo não terminou no tempo previsto.")
		return
	if impact_sprite != null and impact_sprite.visible and impact_sprite.modulate != Color.WHITE:
		_fail("Sprite PixelLab manteve a cor de impacto após a recuperação.")
		return
	hero.global_position = enemy.global_position + Vector2(-60, 0)
	hero.set("facing", 1)
	hero.call("_begin_attack", "light")
	hero.call("_resolve_melee")
	if int(enemy.get("health")) >= initial_health - 5:
		_fail("Combo não atingiu o inimigo na frente do herói.")
		return
	# Inimigos atingidos precisam perder impulso horizontal durante stagger,
	# sem inverter o knockback ou alterar a gravidade e o air-juggle.
	enemy.set("velocity", Vector2(300.0, -120.0))
	enemy.set("stagger", 0.20)
	enemy.call("_physics_process", 0.05)
	var foe_knockback: Vector2 = enemy.get("velocity")
	if foe_knockback.x < -0.01 or foe_knockback.x >= 299.0:
		_fail("Inimigo não desacelerou knockback durante stagger.")
		return
	enemy.set("velocity", Vector2(-40.0, 0.0))
	enemy.set("stagger", 0.20)
	enemy.call("_physics_process", 0.10)
	var foe_stop: Vector2 = enemy.get("velocity")
	if absf(foe_stop.x) > 0.01:
		_fail("Amortecimento do inimigo inverteu o knockback ao cruzar zero.")
		return

	# Receber dano durante um golpe deve cancelar hit pendente e dash.
	hero.set("attack_time", 0.22)
	hero.set("attack_kind", "heavy")
	hero.set("attack_hit", false)
	hero.set("dash_time", 0.12)
	hero.set("combo_window", 0.50)
	hero.set("combo_step", 2)
	# Uma magia recém-lançada ainda pode ter brilho ativo quando o golpe chega.
	hero.set("skill_flash", 0.40)
	hero.call("take_damage", 8, Vector2.ZERO)
	if float(hero.get("attack_time")) > 0.0 or str(hero.get("attack_kind")) != "" or float(hero.get("dash_time")) > 0.0:
		_fail("Dano não interrompeu golpe pendente e dash.")
		return
	if float(hero.get("combo_window")) > 0.0 or int(hero.get("combo_step")) != 0 or bool(hero.get("attack_hit")):
		_fail("Dano preservou combo ou hit pendente.")
		return
	if float(hero.get("skill_flash")) > 0.0:
		_fail("O brilho da magia anterior permaneceu ativo após receber dano.")
		return
	if int(hero.get("health")) != 92:
		_fail("O herói não recebeu dano corretamente.")
		return

	# Dano repetido durante a janela de invulnerabilidade não pode drenar vida.
	var health_after_hit := int(hero.get("health"))
	hero.call("take_damage", 30, Vector2(200.0, -200.0))
	if int(hero.get("health")) != health_after_hit:
		_fail("Invulnerabilidade não bloqueou o segundo golpe consecutivo.")
		return

	# Knockback de dano deve perder velocidade enquanto o herói está atordoado.
	# Sem amortecimento, o impulso horizontal permanece constante por vários frames.
	hero.set("velocity", Vector2(300.0, -120.0))
	hero.set("stagger", 0.18)
	hero.set("dash_time", 0.0)
	hero.call("_physics_process", 0.05)
	var knockback_after_frame: Vector2 = hero.get("velocity")
	if knockback_after_frame.x < -0.01 or knockback_after_frame.x >= 299.0:
		_fail("Knockback horizontal não desacelerou durante stagger.")
		return
	# Não deve inverter o empurrão mesmo com delta grande.
	hero.set("velocity", Vector2(-40.0, 0.0))
	hero.set("stagger", 0.18)
	hero.call("_physics_process", 0.10)
	var knockback_after_stop: Vector2 = hero.get("velocity")
	if absf(knockback_after_stop.x) > 0.01:
		_fail("Amortecimento do knockback ultrapassou zero e inverteu a direção.")
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

	# Cada estágio do combo deve começar do frame 0, inclusive o quarto golpe.
	# A duração visual do finalizador precisa corresponder aos 0,39 s de recovery.
	var combat_sprite := hero.get("pixel_sprite") as AnimatedSprite2D
	if combat_sprite != null and combat_sprite.visible and combat_sprite.sprite_frames.has_animation("attack"):
		hero.set("attack_time", 0.0)
		hero.set("combo_window", 0.0)
		for stage in range(1, 5):
			hero.set("attack_time", 0.0)
			combat_sprite.set_frame_and_progress(5, 0.5)
			hero.call("_begin_attack", "light")
			if int(hero.get("combo_step")) != stage or combat_sprite.frame != 0:
				_fail("O golpe %d não reiniciou o sprite PixelLab no primeiro quadro." % stage)
				return
			var expected_scale := 0.31 / (0.39 if stage == 4 else 0.31)
			if absf(combat_sprite.speed_scale - expected_scale) > 0.001:
				_fail("O golpe %d não sincronizou duração da animação com o combate." % stage)
				return
		# Ao voltar para idle, a velocidade padrão precisa ser restaurada.
		combat_sprite.call("show_state", "idle", 1)
		if absf(combat_sprite.speed_scale - 1.0) > 0.001:
			_fail("Velocidade alterada do finalizador vazou para idle.")
			return
		hero.set("attack_time", 0.0)
		hero.set("combo_window", 0.83)
		hero.set("combo_step", 1)
		hero.set("attack_kind", "light")

	# J pressionado cedo não pode pular a animação atual nem antecipar o combo.
	hero.set("attack_time", 0.24)
	hero.call("_begin_attack", "light")
	if float(hero.get("buffered_light_time")) > 0.0:
		_fail("O combo aceitou J fora da janela final de buffer.")
		return
	# Nos últimos 160 ms, o comando é consumido ao término do golpe.
	hero.set("attack_time", 0.09)
	hero.call("_begin_attack", "light")
	if int(hero.get("combo_step")) != 1 or float(hero.get("buffered_light_time")) <= 0.0:
		_fail("J antecipado não foi armazenado ou pulou o golpe inicial.")
		return
	hero.call("_physics_process", 0.10)
	if int(hero.get("combo_step")) != 2 or float(hero.get("attack_time")) <= 0.0 or float(hero.get("buffered_light_time")) > 0.0:
		_fail("O próximo golpe do combo não consumiu o buffer no tempo correto.")
		return
	# O golpe final mantém recovery: J não começa automaticamente outro ciclo.
	hero.set("attack_time", 0.0)
	hero.set("combo_step", 3)
	hero.set("combo_window", 0.50)
	hero.call("_begin_attack", "light")
	hero.set("attack_time", 0.09)
	hero.call("_begin_attack", "light")
	if int(hero.get("combo_step")) != 4 or float(hero.get("buffered_light_time")) > 0.0:
		_fail("O quarto golpe permitiu cancelar seu tempo de recuperação.")
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
