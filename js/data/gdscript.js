/* GDScript language reference — syntax, types, built-ins, signals, exports, callbacks. */
window.LG_GDSCRIPT = [
  /* ---------------- Basics ---------------- */
  {
    id: "variables", section: "Basics", name: "Variables & constants",
    desc: "Use var for variables, const for constants. Types are optional but recommended with : Type.",
    example: `var health := 100           # inferred as int
var name: String = "Player" # explicit type
const GRAVITY := 9.8        # constant
var enemies: Array[Node] = []

health -= 10
name = name + " 2"`
  },
  {
    id: "types", section: "Basics", name: "Built-in types",
    desc: "Primitive and built-in types: int, float, bool, String, StringName, Vector2/3/4, Color, Array, Dictionary, NodePath, Callable.",
    example: `var i: int = 42
var f: float = 3.14
var b: bool = true
var s: String = "hello"
var v := Vector2(10, 20)
var c := Color.RED
var list: Array[int] = [1, 2, 3]
var data: Dictionary = {"name": "Ana", "level": 3}`
  },
  {
    id: "if-else", section: "Basics", name: "If / elif / else",
    desc: "Standard conditional. Blocks use indentation, like Python.",
    example: `var score := 70
if score >= 90:
    print("A")
elif score >= 70:
    print("B")
else:
    print("try again")`
  },
  {
    id: "for-loop", section: "Basics", name: "For loop",
    desc: "Iterate a range, an array, a dictionary's keys, or a string's characters.",
    example: `for i in 5:
    print(i)                # 0..4

for name in ["Ann", "Bo"]:
    print(name)

for key in {"x": 1, "y": 2}:
    print(key)

for ch in "abc":
    print(ch)`
  },
  {
    id: "while-loop", section: "Basics", name: "While loop",
    desc: "Loop while condition is true. Use break / continue.",
    example: `var i := 0
while i < 3:
    print(i)
    i += 1`
  },
  {
    id: "match", section: "Basics", name: "Match (pattern)",
    desc: "Like switch — matches values, arrays, or type patterns.",
    example: `var value := "fire"
match value:
    "fire":
        print("hot")
    "ice":
        print("cold")
    _:
        print("unknown")`
  },
  {
    id: "functions", section: "Basics", name: "Functions",
    desc: "Defined with func. Types and a return type are optional but recommended.",
    example: `func greet(name: String = "World") -> String:
    return "Hello, " + name + "!"

func add(a: int, b: int) -> int:
    return a + b

print(greet())         # Hello, World!
print(add(2, 3))       # 5`
  },

  /* ---------------- OOP ---------------- */
  {
    id: "extends", section: "OOP", name: "extends — inheritance",
    desc: "Every script extends a class. The first line gives the base class.",
    example: `extends Node2D

func _ready() -> void:
    print("I am a Node2D")`
  },
  {
    id: "class_name", section: "OOP", name: "class_name — register globally",
    desc: "Makes a class reachable by name everywhere and adds it to the 'Create Node' dialog.",
    example: `class_name Enemy
extends CharacterBody2D

var hp := 10

func hurt(amount: int) -> void:
    hp -= amount
    if hp <= 0:
        queue_free()`
  },
  {
    id: "inner-class", section: "OOP", name: "Inner classes",
    desc: "Declare a class inside a script using 'class Name:'.",
    example: `class Item:
    var name: String
    var price: int
    func _init(n, p):
        name = n
        price = p

func _ready():
    var sword := Item.new("Sword", 50)
    print(sword.name)`
  },
  {
    id: "static", section: "OOP", name: "Static functions and variables",
    desc: "Declare with 'static func'. Called via the class/type name.",
    example: `class_name MathUtil
extends RefCounted

static func clamp01(x: float) -> float:
    return clamp(x, 0.0, 1.0)

# Elsewhere:
# var v := MathUtil.clamp01(1.7) # -> 1.0`
  },

  /* ---------------- Signals ---------------- */
  {
    id: "signals", section: "Signals", name: "signal & connect",
    desc: "Signals are Godot's events. Declare with 'signal', emit with emit(), and listen with .connect(callable).",
    example: `extends Node
signal died(reason: String)

func _ready():
    died.connect(_on_died)
    emit_signal("died", "fell in pit")   # old-style
    died.emit("timed out")               # new-style

func _on_died(reason: String):
    print("died: ", reason)`
  },
  {
    id: "connect-method", section: "Signals", name: "Connecting the right way (Godot 4)",
    desc: "Use .connect(callable). Pass extra data via Callable.bind().",
    example: `func _ready():
    $Button.pressed.connect(_on_pressed)
    $Button2.pressed.connect(_on_named.bind("B2"))

func _on_pressed():
    print("b1")

func _on_named(which: String):
    print("pressed ", which)`
  },
  {
    id: "await", section: "Signals", name: "await — wait for a signal",
    desc: "Await a signal or a coroutine. The function becomes asynchronous.",
    example: `func _ready():
    print("start")
    await get_tree().create_timer(1.0).timeout
    print("1 second later")`
  },

  /* ---------------- Exports & Annotations ---------------- */
  {
    id: "export", section: "Annotations", name: "@export — editor-exposed variables",
    desc: "Expose a variable in the Inspector so designers can edit it without touching code.",
    example: `extends Sprite2D

@export var speed: float = 100.0
@export_range(0, 10, 0.1) var damage: float = 1.0
@export_color_no_alpha var tint: Color = Color.WHITE
@export var hero_scene: PackedScene
@export_enum("Easy","Normal","Hard") var difficulty: String = "Normal"`
  },
  {
    id: "onready", section: "Annotations", name: "@onready — initialize on ready",
    desc: "Assign the variable when _ready runs. Common for $Node paths.",
    example: `extends Node2D

@onready var label: Label = $UI/Label
@onready var player: Node2D = get_node("../Player")

func _ready():
    label.text = "Hello " + player.name`
  },
  {
    id: "tool", section: "Annotations", name: "@tool — run in the editor",
    desc: "Makes the script run inside the editor too. Useful for live previews.",
    example: `@tool
extends Node2D

@export var radius: float = 30.0:
    set(v):
        radius = v
        queue_redraw()

func _draw():
    draw_circle(Vector2.ZERO, radius, Color.WHITE)`
  },
  {
    id: "setter-getter", section: "Annotations", name: "Property setter / getter",
    desc: "Run code when a property is read or written.",
    example: `var health: int = 100:
    set(value):
        health = clamp(value, 0, 100)
        print("hp is now ", health)
    get:
        return health`
  },

  /* ---------------- Lifecycle ---------------- */
  {
    id: "ready", section: "Lifecycle", name: "_ready()",
    desc: "Called when the node and all its children have entered the tree. Good place to wire up signals and grab references.",
    example: `func _ready() -> void:
    print(name, " is ready")`
  },
  {
    id: "process", section: "Lifecycle", name: "_process(delta)",
    desc: "Called every frame. delta is time since last frame in seconds. Use for animations, timers, UI.",
    example: `func _process(delta: float) -> void:
    rotation += delta`
  },
  {
    id: "physics-process", section: "Lifecycle", name: "_physics_process(delta)",
    desc: "Called at a fixed rate (60 Hz by default). Use for physics and movement.",
    example: `func _physics_process(delta: float) -> void:
    velocity.x = 100
    move_and_slide()`
  },
  {
    id: "input", section: "Lifecycle", name: "_input(event) / _unhandled_input(event)",
    desc: "Receive input events. _input sees everything; _unhandled_input only what UI did not consume.",
    example: `func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventKey and event.pressed:
        if event.keycode == KEY_ESCAPE:
            get_tree().quit()`
  },
  {
    id: "enter-exit-tree", section: "Lifecycle", name: "_enter_tree / _exit_tree",
    desc: "Called when the node is added or removed from the scene tree."
  },
  {
    id: "draw", section: "Lifecycle", name: "_draw() (CanvasItem)",
    desc: "Custom 2D drawing. Call queue_redraw() to request a redraw.",
    example: `extends Node2D

func _draw() -> void:
    draw_rect(Rect2(0, 0, 100, 50), Color.RED)
    draw_line(Vector2.ZERO, Vector2(100, 100), Color.WHITE, 2.0)`
  },

  /* ---------------- Built-ins ---------------- */
  {
    id: "print", section: "Built-ins", name: "print / printerr / push_warning",
    desc: "Logging. print shows in the Output panel; printerr shows an error; push_warning shows a yellow warning.",
    example: `print("value =", 42)
printerr("something broke")
push_warning("be careful")`
  },
  {
    id: "math", section: "Built-ins", name: "Math functions",
    desc: "Global math: abs, sign, sqrt, pow, sin, cos, tan, floor, ceil, round, clamp, lerp, min, max, fmod, deg_to_rad, rad_to_deg.",
    example: `print(abs(-5))               # 5
print(clamp(150, 0, 100))    # 100
print(lerp(0, 10, 0.25))     # 2.5
print(sin(PI / 2))           # 1.0`
  },
  {
    id: "rand", section: "Built-ins", name: "Randomness",
    desc: "randi(), randf(), randi_range(a,b), randf_range(a,b), randomize(), and the RandomNumberGenerator class.",
    example: `randomize()
print(randf())               # 0..1
print(randi_range(1, 6))     # dice roll
var rng := RandomNumberGenerator.new()
rng.seed = 12345
print(rng.randf())`
  },
  {
    id: "typeof-is", section: "Built-ins", name: "typeof / is / as",
    desc: "Check types at runtime. typeof returns a TYPE_* constant; `is` tests class; `as` casts (null if not possible).",
    example: `var x = 1
print(typeof(x) == TYPE_INT) # true

var n: Node = get_node_or_null("Player")
if n is CharacterBody2D:
    (n as CharacterBody2D).move_and_slide()`
  },

  /* ---------------- Input / scene helpers ---------------- */
  {
    id: "input-singleton", section: "Input", name: "Input (singleton)",
    desc: "Global input state: Input.is_action_pressed, Input.is_action_just_pressed, Input.get_axis, Input.get_vector, mouse.",
    example: `if Input.is_action_just_pressed("ui_accept"):
    print("jump")

var dir := Input.get_axis("ui_left", "ui_right")  # -1..1
var vec := Input.get_vector("ui_left","ui_right","ui_up","ui_down")`
  },
  {
    id: "scene-tree", section: "Scene / tree", name: "SceneTree & change_scene_to_file",
    desc: "Access the scene tree with get_tree(). Change the running scene with get_tree().change_scene_to_file(path).",
    example: `func _on_play_pressed():
    get_tree().change_scene_to_file("res://game.tscn")

func _on_quit_pressed():
    get_tree().quit()`
  },
  {
    id: "get-node", section: "Scene / tree", name: "$ and get_node()",
    desc: "$Path is shorthand for get_node('Path'). Use % unique-name prefix for scene-unique names.",
    example: `@onready var sprite = $Sprite2D        # child named Sprite2D
@onready var hp_bar = %HPBar            # unique name anywhere in scene

func _ready():
    sprite.modulate = Color.AQUA
    hp_bar.value = 100`
  },
  {
    id: "preload-load", section: "Resources", name: "preload vs load",
    desc: "preload() is compile-time (the resource is baked into your script). load() is runtime.",
    example: `const BULLET := preload("res://bullet.tscn")  # compile-time
var enemy_scene := load("res://enemy.tscn")   # runtime

var b := BULLET.instantiate()
add_child(b)`
  },
  {
    id: "instantiate", section: "Scenes", name: "Instancing scenes",
    desc: "PackedScene.instantiate() returns a new Node tree based on the saved .tscn.",
    example: `const BULLET := preload("res://bullet.tscn")

func shoot(target: Vector2):
    var b := BULLET.instantiate()
    b.global_position = global_position
    b.set("target", target)
    get_tree().current_scene.add_child(b)`
  },
  {
    id: "groups", section: "Scene / tree", name: "Groups",
    desc: "Tag nodes for quick lookups.",
    example: `# In _ready of enemy:
add_to_group("enemies")

# Somewhere else:
for e in get_tree().get_nodes_in_group("enemies"):
    e.queue_free()`
  },

  /* ---------------- Save / Load ---------------- */
  {
    id: "save-file", section: "Files", name: "FileAccess — save/load",
    desc: "Read and write files. user:// is writable, res:// is read-only at runtime.",
    example: `func save_data(data: Dictionary) -> void:
    var f := FileAccess.open("user://save.json", FileAccess.WRITE)
    f.store_string(JSON.stringify(data))

func load_data() -> Dictionary:
    if not FileAccess.file_exists("user://save.json"):
        return {}
    var f := FileAccess.open("user://save.json", FileAccess.READ)
    return JSON.parse_string(f.get_as_text())`
  },

  /* ---------------- Threads / advanced ---------------- */
  {
    id: "coroutines", section: "Advanced", name: "Coroutines (await)",
    desc: "A function that contains `await` returns a coroutine and is resumed when the awaited signal fires.",
    example: `func blink(times := 3) -> void:
    for i in times:
        modulate = Color.RED
        await get_tree().create_timer(0.1).timeout
        modulate = Color.WHITE
        await get_tree().create_timer(0.1).timeout`
  },
  {
    id: "error-handling", section: "Advanced", name: "assert & error return codes",
    desc: "Use assert() to catch programming mistakes in debug builds. Many engine methods return an Error enum (OK, FAILED, etc).",
    example: `func sqrt_pos(x: float) -> float:
    assert(x >= 0, "x must be >= 0")
    return sqrt(x)`
  }
];
