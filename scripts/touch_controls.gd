extends CanvasLayer
## Six original Re:Dream practice controls, now native Godot multitouch.
## TouchScreenButton handles multitouch; Godot maps desktop mouse to touch for browser testing.
## A Label/Panel is visual only, so it never consumes touches intended for gameplay.

const BUTTON_SIZE := Vector2(76.0, 70.0)
const BUTTON_DEFS := [
	{"title": "◀", "action": "move_left", "position": Vector2(24, 550)},
	{"title": "▶", "action": "move_right", "position": Vector2(186, 550)},
	{"title": "↑", "action": "jump", "position": Vector2(105, 476)},
	{"title": "↓", "action": "drop_platform", "position": Vector2(105, 590)},
	{"title": "J", "action": "attack_light", "position": Vector2(1030, 555)},
	{"title": "Z", "action": "charge_skill", "position": Vector2(1130, 555)},
]

func _ready() -> void:
	# The web version keeps the buttons available even if touch is detected late.
	visible = OS.has_feature("web") or DisplayServer.is_touchscreen_available()
	layer = 12
	var visuals := Control.new()
	visuals.name = "TouchVisuals"
	visuals.mouse_filter = Control.MOUSE_FILTER_IGNORE
	visuals.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(visuals)
	for definition in BUTTON_DEFS:
		_create_button(visuals, str(definition["title"]), str(definition["action"]), definition["position"])


func _create_button(visuals: Control, title: String, action: String, top_left: Vector2) -> void:
	var panel := Panel.new()
	panel.position = top_left
	panel.size = BUTTON_SIZE
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var surface := StyleBoxFlat.new()
	surface.bg_color = Color(0.09, 0.15, 0.31, 0.76)
	surface.border_color = Color(0.62, 0.93, 0.95, 0.75)
	surface.set_border_width_all(2)
	surface.set_corner_radius_all(15)
	panel.add_theme_stylebox_override("panel", surface)
	visuals.add_child(panel)

	var caption := Label.new()
	caption.text = title
	caption.size = BUTTON_SIZE
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption.add_theme_font_size_override("font_size", 34)
	caption.add_theme_color_override("font_color", Color("#edffff"))
	panel.add_child(caption)

	var touch := TouchScreenButton.new()
	touch.name = "Touch_" + action
	touch.action = action
	touch.position = top_left + BUTTON_SIZE * 0.5
	var hitbox := RectangleShape2D.new()
	hitbox.size = BUTTON_SIZE
	touch.shape = hitbox
	touch.shape_centered = true
	touch.visibility_mode = TouchScreenButton.VISIBILITY_ALWAYS
	touch.pressed.connect(_set_feedback.bind(panel, true))
	touch.released.connect(_set_feedback.bind(panel, false))
	add_child(touch)


func _set_feedback(panel: Panel, held: bool) -> void:
	if is_instance_valid(panel):
		panel.modulate = Color(0.66, 1.0, 1.0, 1.0) if held else Color.WHITE
