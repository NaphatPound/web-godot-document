/* Step-by-step lessons with interactive quizzes. */
window.LG_TUTORIALS = [
  {
    id: "hello-godot",
    title: "1. Hello Godot",
    summary: "Open the editor, create your first project and print 'Hello'.",
    estimate: "5 min",
    body: [
      { type: "p", text: "Welcome! In this first lesson you will create a new Godot project and print your first message. Godot organizes everything into <em>projects</em>, which contain <em>scenes</em>, which contain <em>nodes</em>." },
      { type: "h3", text: "Steps" },
      { type: "ol", items: [
        "Open Godot. Click <strong>New Project</strong>, choose a folder, click <strong>Create & Edit</strong>.",
        "On the right, in the <strong>Scene</strong> panel, click <strong>Other Node</strong> and pick <code>Node</code>. Click <strong>Create</strong>.",
        "Right-click the new <code>Node</code> in the Scene panel and choose <strong>Attach Script</strong>.",
        "Save the script as <code>main.gd</code> and replace the code with the script below.",
        "Press <kbd>F5</kbd> (or the Play button). When asked, set this scene as the main scene."
      ]},
      { type: "code", text: `extends Node

func _ready() -> void:
    print("Hello, Godot!")` },
      { type: "p", text: "You should see <strong>Hello, Godot!</strong> in the <em>Output</em> panel at the bottom of the editor." },
      { type: "callout", text: "The function <code>_ready()</code> runs once, as soon as the node enters the scene tree." }
    ],
    quiz: {
      question: "Which callback runs ONE time when the node is first placed in the scene tree?",
      options: ["_process(delta)", "_ready()", "_input(event)", "_draw()"],
      correct: 1,
      explain: "_ready() runs once. _process runs every frame. _input runs per input event. _draw runs on redraw."
    }
  },

  {
    id: "first-scene",
    title: "2. Your first scene",
    summary: "Build a simple 2D scene with a background, a sprite and a label.",
    estimate: "8 min",
    body: [
      { type: "p", text: "A <strong>scene</strong> is a tree of nodes saved to a <code>.tscn</code> file. You can open, edit and instance scenes inside other scenes." },
      { type: "h3", text: "Build this scene tree" },
      { type: "pre", text: `Main (Node2D)
├── Background (ColorRect)
├── Icon (Sprite2D)
└── UI (CanvasLayer)
    └── Label (Label)` },
      { type: "ol", items: [
        "Create a <code>Node2D</code> named <code>Main</code>. Save as <code>main.tscn</code>.",
        "Add the children as shown above. Drag <code>res://icon.svg</code> into <code>Icon</code>'s <em>Texture</em> property.",
        "Set <code>ColorRect</code> size to match the viewport and pick a color.",
        "Set the <code>Label</code>'s text to <code>Welcome!</code>.",
        "Attach this script to <code>Main</code>."
      ]},
      { type: "code", text: `extends Node2D

@onready var icon: Sprite2D = $Icon
@onready var label: Label = $UI/Label

func _ready() -> void:
    icon.position = get_viewport_rect().size / 2
    label.text = "Welcome to Godot!"` },
      { type: "callout", text: "<code>@onready</code> waits for <code>_ready()</code> before assigning — at that point children exist." }
    ],
    quiz: {
      question: "What does <code>$Icon</code> mean in a script?",
      options: [
        "It imports a file named Icon.",
        "Shortcut for <code>get_node(\"Icon\")</code> — finds a child node named <code>Icon</code>.",
        "A GDScript string literal.",
        "A comment."
      ],
      correct: 1,
      explain: "$ is shorthand for get_node(). It looks up a child by name or path."
    }
  },

  {
    id: "movement",
    title: "3. Player movement (2D)",
    summary: "Move a character with the keyboard using CharacterBody2D.",
    estimate: "10 min",
    body: [
      { type: "p", text: "For a player you control with the keyboard, use <code>CharacterBody2D</code>. Set <code>velocity</code> each frame, then call <code>move_and_slide()</code> — Godot handles collisions." },
      { type: "h3", text: "Setup" },
      { type: "ol", items: [
        "Create a new scene with root <code>CharacterBody2D</code> named <code>Player</code>.",
        "Add a <code>Sprite2D</code> child and give it a texture.",
        "Add a <code>CollisionShape2D</code> child; set <em>Shape</em> to a new <code>RectangleShape2D</code>.",
        "Attach the script below to the root."
      ]},
      { type: "code", text: `extends CharacterBody2D

@export var speed: float = 250.0

func _physics_process(delta: float) -> void:
    var dir := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
    velocity = dir * speed
    move_and_slide()` },
      { type: "callout", text: "<code>Input.get_vector</code> reads 4 actions and returns a <code>Vector2</code> already normalized for diagonals." }
    ],
    quiz: {
      question: "Why use <code>_physics_process</code> instead of <code>_process</code> for movement?",
      options: [
        "It runs more often.",
        "It runs at a fixed rate so physics is stable and consistent.",
        "It is the only place Input works.",
        "It is faster."
      ],
      correct: 1,
      explain: "_physics_process runs at a fixed tick rate (default 60 Hz), keeping physics simulations deterministic."
    }
  },

  {
    id: "signals",
    title: "4. Signals & events",
    summary: "React to events without coupling nodes.",
    estimate: "7 min",
    body: [
      { type: "p", text: "Signals are how nodes say 'something happened'. Other code listens with <code>.connect(callable)</code>. This keeps the event emitter and the handler loosely connected." },
      { type: "code", text: `extends Node
signal score_changed(new_score: int)

var score := 0:
    set(v):
        score = v
        score_changed.emit(v)` },
      { type: "p", text: "Elsewhere in your scene:" },
      { type: "code", text: `func _ready():
    $GameState.score_changed.connect(_on_score)

func _on_score(new_score: int):
    $UI/ScoreLabel.text = "Score: %d" % new_score` },
      { type: "callout", text: "Built-in signals are everywhere: <code>Button.pressed</code>, <code>Timer.timeout</code>, <code>Area2D.body_entered</code>." }
    ],
    quiz: {
      question: "Which is the correct way to listen to a Button press in Godot 4?",
      options: [
        "<code>$Button.connect(\"pressed\", self, \"_on_pressed\")</code>",
        "<code>$Button.pressed.connect(_on_pressed)</code>",
        "<code>$Button.on_pressed = _on_pressed</code>",
        "<code>connect($Button.pressed)</code>"
      ],
      correct: 1,
      explain: "Godot 4 uses Callable-based connections: signal.connect(function)."
    }
  },

  {
    id: "physics-gravity",
    title: "5. Physics & gravity",
    summary: "Add jumping and gravity for a platformer player.",
    estimate: "10 min",
    body: [
      { type: "p", text: "Apply gravity every physics frame and spring the velocity upward on jump." },
      { type: "code", text: `extends CharacterBody2D

@export var speed := 220.0
@export var jump_strength := -420.0
@export var gravity := 900.0

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += gravity * delta

    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = jump_strength

    velocity.x = Input.get_axis("ui_left", "ui_right") * speed
    move_and_slide()` },
      { type: "callout", text: "Floors are detected based on the <code>up_direction</code> and the surface angle. Default <code>up</code> is (0,-1)." }
    ],
    quiz: {
      question: "Why is jump velocity <strong>negative</strong>?",
      options: [
        "To pull the character down.",
        "Because Y axis in Godot 2D points DOWN — negative is UP.",
        "It is a bug.",
        "Because gravity is positive."
      ],
      correct: 1,
      explain: "In Godot 2D, positive Y is down. To go up, subtract from y."
    }
  },

  {
    id: "ui-basics",
    title: "6. UI basics",
    summary: "Lay out buttons and labels with containers.",
    estimate: "8 min",
    body: [
      { type: "p", text: "UI nodes inherit from <code>Control</code>. The easiest way to lay things out is with containers — <code>VBoxContainer</code>, <code>HBoxContainer</code>, <code>GridContainer</code>, <code>MarginContainer</code>." },
      { type: "pre", text: `CanvasLayer
└── MarginContainer (full rect, 20px margins)
    └── VBoxContainer
        ├── Label  ("Pause Menu")
        ├── Button ("Resume")
        └── Button ("Quit")` },
      { type: "code", text: `extends CanvasLayer

func _ready():
    $MarginContainer/VBoxContainer/Button.pressed.connect(_on_resume)
    $MarginContainer/VBoxContainer/Button2.pressed.connect(get_tree().quit)

func _on_resume():
    queue_free()` }
    ],
    quiz: {
      question: "Which container automatically stacks its children top to bottom?",
      options: ["HBoxContainer", "VBoxContainer", "PanelContainer", "GridContainer"],
      correct: 1,
      explain: "V = Vertical, H = Horizontal."
    }
  },

  {
    id: "instancing",
    title: "7. Instancing scenes",
    summary: "Spawn bullets, enemies, coins from a saved scene.",
    estimate: "8 min",
    body: [
      { type: "p", text: "Save any scene and instance it at runtime with <code>PackedScene.instantiate()</code>. This is how you spawn enemies, bullets, pickups." },
      { type: "code", text: `extends Node2D

const BULLET := preload("res://bullet.tscn")

func _unhandled_input(event):
    if event.is_action_pressed("fire"):
        var b := BULLET.instantiate()
        b.global_position = global_position
        b.rotation = rotation
        get_tree().current_scene.add_child(b)` }
    ],
    quiz: {
      question: "What does <code>preload()</code> do?",
      options: [
        "Loads a resource at runtime, like <code>load()</code>.",
        "Loads a resource at compile time and bakes it into the script — faster at runtime.",
        "Deletes a resource.",
        "Runs a scene."
      ],
      correct: 1,
      explain: "preload runs when the script is first parsed, so the resource is instantly available."
    }
  },

  {
    id: "save-load",
    title: "8. Save / load data",
    summary: "Persist player progress with JSON in user://.",
    estimate: "8 min",
    body: [
      { type: "p", text: "Write to <code>user://</code>, which is a per-user writable folder. <code>res://</code> is read-only at runtime." },
      { type: "code", text: `const PATH := "user://save.json"

func save(state: Dictionary) -> void:
    var f := FileAccess.open(PATH, FileAccess.WRITE)
    f.store_string(JSON.stringify(state))

func load_state() -> Dictionary:
    if not FileAccess.file_exists(PATH):
        return {}
    var f := FileAccess.open(PATH, FileAccess.READ)
    return JSON.parse_string(f.get_as_text())` }
    ],
    quiz: {
      question: "Where should you write save files in Godot?",
      options: ["res://", "user://", "file://", "assets://"],
      correct: 1,
      explain: "res:// is the project (read-only in exports). user:// is the writable per-user folder."
    }
  }
];
