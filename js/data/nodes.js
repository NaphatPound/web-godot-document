/* Major Godot nodes organized by category. */
window.LG_NODES = [
  /* ---------------- Core ---------------- */
  {
    id: "node", name: "Node", category: "Core", inherits: "Object",
    desc: "Base class of all scene objects. Every scene in Godot is a tree of nodes. Node handles the scene tree, groups, processing and lifecycle callbacks.",
    properties: [
      { name: "name", type: "StringName", desc: "Unique name among its siblings." },
      { name: "process_mode", type: "ProcessMode", desc: "How the node should process when paused." },
      { name: "owner", type: "Node", desc: "Node that owns this one for scene saving." }
    ],
    methods: [
      { sig: "add_child(node: Node)", desc: "Adds a child node to this one." },
      { sig: "queue_free()", desc: "Deletes the node safely at the end of the frame." },
      { sig: "get_node(path: NodePath) -> Node", desc: "Fetch a node using its scene path." },
      { sig: "get_tree() -> SceneTree", desc: "Returns the scene tree this node is in." },
      { sig: "find_child(pattern: String) -> Node", desc: "Find a descendant by name pattern." }
    ],
    callbacks: [
      "_ready()", "_process(delta)", "_physics_process(delta)",
      "_input(event)", "_unhandled_input(event)", "_enter_tree()", "_exit_tree()"
    ],
    example: `extends Node

func _ready() -> void:
    print("Scene is ready")
    # Add a Timer as child at runtime
    var t := Timer.new()
    t.wait_time = 1.0
    t.autostart = true
    t.timeout.connect(_on_tick)
    add_child(t)

func _on_tick() -> void:
    print("tick")`
  },

  {
    id: "node2d", name: "Node2D", category: "2D", inherits: "CanvasItem < Node",
    desc: "Base node for 2D scenes. Adds position, rotation, scale and skew — a 2D transform. Attach scripts here when you want custom 2D logic.",
    properties: [
      { name: "position", type: "Vector2", desc: "Local position." },
      { name: "rotation", type: "float", desc: "Local rotation in radians." },
      { name: "scale", type: "Vector2", desc: "Local scale." },
      { name: "z_index", type: "int", desc: "Draw order; higher draws on top." }
    ],
    methods: [
      { sig: "global_position", desc: "Shortcut for world position." },
      { sig: "look_at(target: Vector2)", desc: "Rotate to face a 2D point." },
      { sig: "rotate(radians: float)", desc: "Rotate by angle." }
    ],
    example: `extends Node2D

func _process(delta: float) -> void:
    position.x += 100 * delta # move right 100px per second
    rotation += delta         # spin`
  },

  {
    id: "node3d", name: "Node3D", category: "3D", inherits: "Node",
    desc: "Base node for 3D scenes. Holds a 3D Transform (position, rotation, scale).",
    properties: [
      { name: "position", type: "Vector3", desc: "Local position." },
      { name: "rotation", type: "Vector3", desc: "Euler rotation in radians." },
      { name: "scale", type: "Vector3", desc: "Local scale." },
      { name: "transform", type: "Transform3D", desc: "Full 3D transform." },
      { name: "visible", type: "bool", desc: "Whether node renders." }
    ],
    methods: [
      { sig: "look_at(target: Vector3, up: Vector3 = Vector3.UP)", desc: "Rotate to face target." },
      { sig: "translate(offset: Vector3)", desc: "Move by local offset." },
      { sig: "rotate_y(angle: float)", desc: "Rotate around local Y axis." }
    ],
    example: `extends Node3D

@export var speed := 2.0

func _process(delta: float) -> void:
    translate(Vector3.FORWARD * speed * delta)`
  },

  /* ---------------- 2D: visuals ---------------- */
  {
    id: "sprite2d", name: "Sprite2D", category: "2D", inherits: "Node2D",
    desc: "Draws a texture (optionally a sprite sheet). Cheapest way to show a 2D image.",
    properties: [
      { name: "texture", type: "Texture2D", desc: "Image to draw." },
      { name: "centered", type: "bool", desc: "Use center of texture as origin." },
      { name: "offset", type: "Vector2", desc: "Pixel offset from origin." },
      { name: "flip_h / flip_v", type: "bool", desc: "Mirror the image." },
      { name: "hframes / vframes", type: "int", desc: "Split texture into a sprite sheet grid." },
      { name: "frame", type: "int", desc: "Which sheet frame to draw." },
      { name: "modulate", type: "Color", desc: "Tint color multiplied with texture." }
    ],
    example: `extends Sprite2D

func _ready() -> void:
    texture = preload("res://icon.png")
    centered = true
    modulate = Color(1, 0.6, 0.6) # pink tint`
  },

  {
    id: "animatedsprite2d", name: "AnimatedSprite2D", category: "2D", inherits: "Node2D",
    desc: "Plays frame-based 2D animations defined in a SpriteFrames resource.",
    properties: [
      { name: "sprite_frames", type: "SpriteFrames", desc: "Container of named animations." },
      { name: "animation", type: "StringName", desc: "Currently playing animation." },
      { name: "frame", type: "int", desc: "Current frame." },
      { name: "speed_scale", type: "float", desc: "Playback speed multiplier." }
    ],
    methods: [
      { sig: "play(anim: StringName = \"\")", desc: "Start playing an animation." },
      { sig: "stop()", desc: "Stop playback." },
      { sig: "is_playing() -> bool", desc: "Whether currently playing." }
    ],
    example: `extends AnimatedSprite2D

func _ready() -> void:
    play("walk")

func _process(_delta):
    if not is_playing():
        play("idle")`
  },

  {
    id: "camera2d", name: "Camera2D", category: "2D", inherits: "Node2D",
    desc: "Controls the 2D viewport — what part of the scene is visible. Only one can be active at a time.",
    properties: [
      { name: "enabled", type: "bool", desc: "Is this the active camera." },
      { name: "zoom", type: "Vector2", desc: "Zoom factor. 0.5 zooms out." },
      { name: "position_smoothing_enabled", type: "bool", desc: "Smooth follow." },
      { name: "limit_left/right/top/bottom", type: "int", desc: "Hard camera bounds." }
    ],
    example: `extends Camera2D

func _ready() -> void:
    enabled = true
    zoom = Vector2(1.0, 1.0)
    position_smoothing_enabled = true
    position_smoothing_speed = 5.0`
  },

  /* ---------------- 2D: physics ---------------- */
  {
    id: "characterbody2d", name: "CharacterBody2D", category: "Physics 2D", inherits: "PhysicsBody2D",
    desc: "Physics body designed for characters. You set `velocity` and call `move_and_slide()` to move with collision response, slopes, and floor detection.",
    properties: [
      { name: "velocity", type: "Vector2", desc: "Current velocity; set this then call move_and_slide." },
      { name: "floor_stop_on_slope", type: "bool", desc: "Stay still on slopes when idle." },
      { name: "up_direction", type: "Vector2", desc: "Defines which way is 'up' for floor detection." }
    ],
    methods: [
      { sig: "move_and_slide() -> bool", desc: "Move using velocity, sliding along collisions." },
      { sig: "is_on_floor() -> bool", desc: "True if resting on a floor surface." },
      { sig: "is_on_wall() -> bool", desc: "True if touching a wall." }
    ],
    example: `extends CharacterBody2D

const SPEED := 200.0
const JUMP := -400.0
const GRAVITY := 900.0

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += GRAVITY * delta

    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = JUMP

    var dir := Input.get_axis("ui_left", "ui_right")
    velocity.x = dir * SPEED
    move_and_slide()`
  },

  {
    id: "rigidbody2d", name: "RigidBody2D", category: "Physics 2D", inherits: "PhysicsBody2D",
    desc: "Full physics body — simulated by the engine with mass, forces and torque. Use for barrels, balls, ragdolls.",
    properties: [
      { name: "mass", type: "float", desc: "Body mass." },
      { name: "gravity_scale", type: "float", desc: "Multiplier on world gravity." },
      { name: "linear_damp / angular_damp", type: "float", desc: "Friction-like damping." },
      { name: "freeze", type: "bool", desc: "Freeze the body in place." }
    ],
    methods: [
      { sig: "apply_central_impulse(impulse: Vector2)", desc: "Instant velocity change." },
      { sig: "apply_force(force: Vector2, pos: Vector2 = Vector2.ZERO)", desc: "Constant force at a point." }
    ],
    example: `extends RigidBody2D

func _ready() -> void:
    mass = 2.0
    apply_central_impulse(Vector2(0, -800)) # pop upward`
  },

  {
    id: "staticbody2d", name: "StaticBody2D", category: "Physics 2D", inherits: "PhysicsBody2D",
    desc: "Immovable physics body — walls, floors, platforms that don't move. Other bodies can collide with it.",
    example: `# Build a static floor
# Add a StaticBody2D node, then a CollisionShape2D child with a RectangleShape2D.
# No script needed in most cases.`
  },

  {
    id: "area2d", name: "Area2D", category: "Physics 2D", inherits: "CollisionObject2D",
    desc: "Detects overlap with other 2D bodies/areas (no collision). Use for triggers, pickups, hurt boxes.",
    properties: [
      { name: "monitoring", type: "bool", desc: "Whether it detects overlaps." },
      { name: "gravity", type: "float", desc: "Override gravity for bodies inside." }
    ],
    signals: [
      { name: "body_entered(body)", desc: "A PhysicsBody2D entered." },
      { name: "body_exited(body)", desc: "A PhysicsBody2D left." },
      { name: "area_entered(area)", desc: "Another Area2D entered." }
    ],
    example: `extends Area2D

func _ready() -> void:
    body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node) -> void:
    if body.is_in_group("player"):
        print("player picked up item")
        queue_free()`
  },

  {
    id: "collisionshape2d", name: "CollisionShape2D", category: "Physics 2D", inherits: "Node2D",
    desc: "Attaches a collision shape to a CollisionObject2D (CharacterBody2D, Area2D, etc.). The shape is a resource: RectangleShape2D, CircleShape2D, CapsuleShape2D…",
    example: `# In the editor: add CollisionShape2D as child of CharacterBody2D
# then set its 'shape' to a new RectangleShape2D and size it.`
  },

  /* ---------------- 2D: tiles / light ---------------- */
  {
    id: "tilemap", name: "TileMap / TileMapLayer", category: "2D", inherits: "Node2D",
    desc: "Grid of tiles driven by a TileSet resource. Great for levels. In Godot 4.3+ each layer is its own TileMapLayer node.",
    methods: [
      { sig: "set_cell(layer, coords, source_id, atlas_coords)", desc: "Place a tile." },
      { sig: "get_cell_source_id(layer, coords) -> int", desc: "Read what tile is at a cell." }
    ],
    example: `extends TileMapLayer

func _ready() -> void:
    # Fill a 5x5 floor with the tile at atlas 0,0 of source 0
    for x in 5:
        for y in 5:
            set_cell(Vector2i(x, y), 0, Vector2i(0, 0))`
  },

  {
    id: "light2d", name: "PointLight2D / DirectionalLight2D", category: "2D", inherits: "Node2D",
    desc: "2D lights. PointLight2D shines from a position; DirectionalLight2D shines in a direction. Used with normal maps or occluders for shadows.",
    properties: [
      { name: "energy", type: "float", desc: "Brightness multiplier." },
      { name: "color", type: "Color", desc: "Light color." },
      { name: "texture", type: "Texture2D", desc: "Shape of the light for PointLight2D." }
    ]
  },

  /* ---------------- 3D: visuals ---------------- */
  {
    id: "meshinstance3d", name: "MeshInstance3D", category: "3D", inherits: "GeometryInstance3D",
    desc: "Draws a 3D mesh (BoxMesh, CylinderMesh, imported .glb, etc.).",
    properties: [
      { name: "mesh", type: "Mesh", desc: "The mesh resource to draw." },
      { name: "material_override", type: "Material", desc: "Overrides any mesh materials." }
    ],
    example: `extends MeshInstance3D

func _ready() -> void:
    var m := BoxMesh.new()
    m.size = Vector3(1, 1, 1)
    mesh = m`
  },

  {
    id: "camera3d", name: "Camera3D", category: "3D", inherits: "Node3D",
    desc: "3D camera. Controls what the player sees in 3D. Typically one Camera3D is `current` at a time.",
    properties: [
      { name: "current", type: "bool", desc: "Make this the active camera." },
      { name: "fov", type: "float", desc: "Field of view in degrees." },
      { name: "near / far", type: "float", desc: "Clip planes." }
    ],
    methods: [
      { sig: "project_ray_origin(pos: Vector2)", desc: "Convert a screen pixel to a world ray origin." },
      { sig: "project_ray_normal(pos: Vector2)", desc: "Direction of the ray for that pixel." }
    ]
  },

  {
    id: "directionallight3d", name: "DirectionalLight3D", category: "3D", inherits: "Light3D",
    desc: "Sun-like light that shines in one direction over the whole scene.",
    properties: [
      { name: "light_energy", type: "float", desc: "Brightness." },
      { name: "light_color", type: "Color", desc: "Color of the light." },
      { name: "shadow_enabled", type: "bool", desc: "Whether to cast shadows." }
    ]
  },

  {
    id: "omnilight3d", name: "OmniLight3D", category: "3D", inherits: "Light3D",
    desc: "Point light in 3D that shines in all directions up to a range.",
    properties: [
      { name: "omni_range", type: "float", desc: "How far the light reaches." }
    ]
  },

  {
    id: "spotlight3d", name: "SpotLight3D", category: "3D", inherits: "Light3D",
    desc: "Cone-shaped 3D light, like a flashlight."
  },

  /* ---------------- 3D: physics ---------------- */
  {
    id: "characterbody3d", name: "CharacterBody3D", category: "Physics 3D", inherits: "PhysicsBody3D",
    desc: "3D character controller. Set velocity, call move_and_slide().",
    example: `extends CharacterBody3D

const SPEED := 5.0
const JUMP := 4.5
var gravity := 9.8

func _physics_process(delta):
    if not is_on_floor():
        velocity.y -= gravity * delta

    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = JUMP

    var in2d := Input.get_vector("ui_left","ui_right","ui_up","ui_down")
    var dir := (transform.basis * Vector3(in2d.x, 0, in2d.y)).normalized()
    velocity.x = dir.x * SPEED
    velocity.z = dir.z * SPEED
    move_and_slide()`
  },
  {
    id: "rigidbody3d", name: "RigidBody3D", category: "Physics 3D", inherits: "PhysicsBody3D",
    desc: "Full 3D rigid body physics."
  },
  {
    id: "staticbody3d", name: "StaticBody3D", category: "Physics 3D", inherits: "PhysicsBody3D",
    desc: "Static 3D body — walls, floors that don't move."
  },
  {
    id: "area3d", name: "Area3D", category: "Physics 3D", inherits: "CollisionObject3D",
    desc: "3D trigger area. Emits signals when bodies/areas enter or exit.",
    signals: [
      { name: "body_entered(body)", desc: "PhysicsBody3D entered." },
      { name: "body_exited(body)", desc: "PhysicsBody3D left." }
    ]
  },
  {
    id: "collisionshape3d", name: "CollisionShape3D", category: "Physics 3D", inherits: "Node3D",
    desc: "3D collision shape; attach as child of a CollisionObject3D."
  },

  /* ---------------- UI / Control ---------------- */
  {
    id: "control", name: "Control", category: "UI", inherits: "CanvasItem",
    desc: "Base class for all UI. Adds anchor/margin layout, focus, mouse events.",
    properties: [
      { name: "size", type: "Vector2", desc: "Current size in pixels." },
      { name: "position", type: "Vector2", desc: "Position of top-left corner." },
      { name: "mouse_filter", type: "MouseFilter", desc: "How mouse events are handled." },
      { name: "anchor_*", type: "float", desc: "Anchor each side between 0 (parent start) and 1 (parent end)." }
    ],
    signals: [
      { name: "gui_input(event)", desc: "Mouse / touch events on this control." },
      { name: "focus_entered", desc: "Control gained keyboard focus." }
    ]
  },
  {
    id: "label", name: "Label", category: "UI", inherits: "Control",
    desc: "Displays text.",
    properties: [
      { name: "text", type: "String", desc: "The text to show." },
      { name: "horizontal_alignment", type: "int", desc: "Left/center/right." },
      { name: "autowrap_mode", type: "int", desc: "Word wrapping mode." }
    ],
    example: `extends Label

func _ready():
    text = "Hello Godot!"
    horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER`
  },
  {
    id: "button", name: "Button", category: "UI", inherits: "BaseButton < Control",
    desc: "Clickable button that emits `pressed` when activated.",
    signals: [
      { name: "pressed", desc: "Emitted when clicked or activated via keyboard." },
      { name: "toggled(pressed_state)", desc: "For toggle buttons." }
    ],
    example: `extends Button

func _ready():
    text = "Click me"
    pressed.connect(_on_pressed)

func _on_pressed():
    print("clicked!")`
  },
  {
    id: "lineedit", name: "LineEdit", category: "UI", inherits: "Control",
    desc: "Single-line text input.",
    signals: [
      { name: "text_submitted(text)", desc: "Emitted when Enter pressed." },
      { name: "text_changed(text)", desc: "Every keystroke." }
    ]
  },
  {
    id: "textedit", name: "TextEdit", category: "UI", inherits: "Control",
    desc: "Multi-line text editor, syntax highlighting optional."
  },
  {
    id: "checkbox", name: "CheckBox / CheckButton", category: "UI", inherits: "BaseButton",
    desc: "Toggle controls. CheckBox uses a square; CheckButton looks like a switch."
  },
  {
    id: "optionbutton", name: "OptionButton", category: "UI", inherits: "Button",
    desc: "Dropdown list of items.",
    methods: [
      { sig: "add_item(label: String, id: int = -1)", desc: "Add a new option." },
      { sig: "get_selected_id() -> int", desc: "Current selection ID." }
    ]
  },
  {
    id: "progressbar", name: "ProgressBar", category: "UI", inherits: "Range < Control",
    desc: "Shows a percentage between min_value and max_value."
  },
  {
    id: "slider", name: "HSlider / VSlider", category: "UI", inherits: "Slider < Range",
    desc: "User-adjustable slider."
  },
  {
    id: "texturerect", name: "TextureRect", category: "UI", inherits: "Control",
    desc: "Shows a texture inside a UI layout.",
    properties: [
      { name: "texture", type: "Texture2D", desc: "The texture to draw." },
      { name: "stretch_mode", type: "int", desc: "Scale/tile/keep-size modes." }
    ]
  },
  {
    id: "container", name: "Containers (HBoxContainer, VBoxContainer, GridContainer…)", category: "UI", inherits: "Container < Control",
    desc: "Auto-layout children. Add Controls as children — the container arranges them.",
    example: `extends VBoxContainer

func _ready():
    for i in 3:
        var b := Button.new()
        b.text = "Button %d" % i
        add_child(b)`
  },
  {
    id: "panel", name: "Panel / PanelContainer", category: "UI", inherits: "Control",
    desc: "Background box. PanelContainer also sizes itself around children."
  },
  {
    id: "richtextlabel", name: "RichTextLabel", category: "UI", inherits: "Control",
    desc: "Multi-line label with BBCode formatting for bold, color, links.",
    example: `extends RichTextLabel

func _ready():
    bbcode_enabled = true
    text = "[b]Bold[/b] and [color=red]red[/color] and [url=https://godot]link[/url]"`
  },

  /* ---------------- Animation / Audio / Time ---------------- */
  {
    id: "animationplayer", name: "AnimationPlayer", category: "Animation", inherits: "Node",
    desc: "Plays Animation resources that drive any node property over time.",
    methods: [
      { sig: "play(name: StringName = \"\")", desc: "Play an animation by name." },
      { sig: "stop()", desc: "Stop playing." },
      { sig: "seek(time: float, update: bool = false)", desc: "Jump to a time." }
    ],
    signals: [
      { name: "animation_finished(anim)", desc: "Called when an animation ends." }
    ],
    example: `extends AnimationPlayer

func _ready():
    play("intro")
    animation_finished.connect(func(_n): play("idle"))`
  },
  {
    id: "animationtree", name: "AnimationTree", category: "Animation", inherits: "Node",
    desc: "State-machine and blend-tree driver over an AnimationPlayer. Use for complex character animation."
  },
  {
    id: "tween", name: "Tween", category: "Animation", inherits: "RefCounted",
    desc: "Short, code-driven animations over any property. Created with `get_tree().create_tween()` or `create_tween()` on a Node.",
    example: `extends Node2D

func _ready():
    var t := create_tween()
    t.tween_property(self, "position", Vector2(200, 0), 1.0)
    t.tween_property(self, "modulate", Color.RED, 0.5)
    t.set_loops()`
  },
  {
    id: "timer", name: "Timer", category: "Utility", inherits: "Node",
    desc: "Counts down and emits `timeout`.",
    properties: [
      { name: "wait_time", type: "float", desc: "Seconds to wait." },
      { name: "one_shot", type: "bool", desc: "Stop after one tick." },
      { name: "autostart", type: "bool", desc: "Start automatically when added to the tree." }
    ],
    signals: [
      { name: "timeout", desc: "Emitted when time is up." }
    ],
    example: `extends Node

func _ready():
    var t := Timer.new()
    t.wait_time = 2.0
    t.one_shot = true
    t.timeout.connect(func():
        print("2 seconds later")
        t.queue_free())
    add_child(t)
    t.start()`
  },
  {
    id: "audiostreamplayer", name: "AudioStreamPlayer", category: "Audio", inherits: "Node",
    desc: "Plays non-spatial audio. Use AudioStreamPlayer2D/3D for positional sound.",
    properties: [
      { name: "stream", type: "AudioStream", desc: "The sound to play." },
      { name: "volume_db", type: "float", desc: "Volume in decibels." },
      { name: "autoplay", type: "bool", desc: "Play when entering tree." }
    ],
    methods: [
      { sig: "play(from_position: float = 0.0)", desc: "Start playback." },
      { sig: "stop()", desc: "Stop playback." }
    ],
    example: `extends AudioStreamPlayer

func _ready():
    stream = preload("res://assets/jump.wav")
    play()`
  },
  {
    id: "audiostreamplayer2d", name: "AudioStreamPlayer2D", category: "Audio", inherits: "Node2D",
    desc: "2D positional audio — volume and panning depend on the listener position."
  },
  {
    id: "audiostreamplayer3d", name: "AudioStreamPlayer3D", category: "Audio", inherits: "Node3D",
    desc: "3D positional audio with attenuation and doppler."
  },

  /* ---------------- Viewport / Canvas ---------------- */
  {
    id: "canvaslayer", name: "CanvasLayer", category: "2D / UI", inherits: "Node",
    desc: "Renders children on a separate, fixed canvas layer — great for HUD/UI that should not move with the camera."
  },
  {
    id: "subviewport", name: "SubViewport", category: "Rendering", inherits: "Viewport",
    desc: "A viewport you can embed inside the scene (for minimaps, portal cameras, render-to-texture)."
  },
  {
    id: "parallaxbackground", name: "ParallaxBackground / ParallaxLayer", category: "2D", inherits: "CanvasLayer / Node2D",
    desc: "Creates parallax-scrolling backgrounds relative to the Camera2D."
  },

  /* ---------------- Networking / Other ---------------- */
  {
    id: "multiplayerspawner", name: "MultiplayerSpawner", category: "Networking", inherits: "Node",
    desc: "Automatically replicates spawning of scenes across the network in multiplayer."
  },
  {
    id: "multiplayersynchronizer", name: "MultiplayerSynchronizer", category: "Networking", inherits: "Node",
    desc: "Synchronizes selected properties of a node over the network."
  },

  /* ---------------- Resources (technically not Nodes but vital) ---------------- */
  {
    id: "packedscene", name: "PackedScene (resource)", category: "Resources", inherits: "Resource",
    desc: "Saved scene tree you can instance. Produced by preload('scene.tscn').",
    example: `var bullet_scene: PackedScene = preload("res://bullet.tscn")

func shoot():
    var b := bullet_scene.instantiate()
    add_child(b)
    b.global_position = global_position`
  },
  {
    id: "resource", name: "Resource (custom)", category: "Resources", inherits: "RefCounted",
    desc: "Base of all shareable data (textures, sounds, your own data assets). Define your own with `class_name` on a Resource script.",
    example: `# ItemData.gd
class_name ItemData extends Resource
@export var item_name: String
@export var icon: Texture2D
@export var price: int`
  }
];
