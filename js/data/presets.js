window.LG_PRESETS = [
  {
    id: "hello",
    name: "Hello, Godot",
    code: `# Welcome to the GDScript playground.
# This runs a subset of GDScript in your browser — no Godot install needed.
print("Hello, Godot!")`
  },
  {
    id: "variables",
    name: "Variables & math",
    code: `var name := "Arya"
var level: int = 3
const XP_PER_LEVEL := 100

print("Player: ", name)
print("Level:  ", level)
print("XP to next level: ", XP_PER_LEVEL)
print("Total XP seen:   ", level * XP_PER_LEVEL)`
  },
  {
    id: "if",
    name: "if / elif / else",
    code: `func rate(score: int) -> String:
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    else:
        return "try again"

print(rate(95))
print(rate(72))
print(rate(40))`
  },
  {
    id: "for",
    name: "for loop",
    code: `var items := ["sword", "shield", "potion"]
for item in items:
    print("- ", item)

print("")
print("Range demo:")
for i in range(1, 6):
    print("i = ", i)`
  },
  {
    id: "while",
    name: "while + break",
    code: `var n := 1
while n < 100:
    print(n)
    n *= 2
    if n > 16:
        break
print("done")`
  },
  {
    id: "functions",
    name: "Functions & recursion",
    code: `func factorial(n: int) -> int:
    if n <= 1:
        return 1
    return n * factorial(n - 1)

for i in range(1, 7):
    print(i, "! = ", factorial(i))`
  },
  {
    id: "arrays",
    name: "Arrays",
    code: `var inventory: Array = []
inventory.append("rope")
inventory.append("torch")
inventory.append("map")

print("You carry:")
for item in inventory:
    print("  * ", item)
print("Total items: ", inventory.size())`
  },
  {
    id: "dict",
    name: "Dictionaries",
    code: `var stats := {
    "hp": 100,
    "mp": 40,
    "atk": 12
}

for key in stats:
    print(key, " = ", stats[key])

stats["hp"] -= 25
print("After hit: hp = ", stats["hp"])`
  },
  {
    id: "vector",
    name: "Vector2",
    code: `var a := Vector2(3, 4)
var b := Vector2(1, 2)

print("a = ", a)
print("b = ", b)
print("a + b = ", a + b)
print("a * 2 = ", a * 2)
print("length of a = ", a.length())`
  },
  {
    id: "_ready",
    name: "_ready() is auto-called",
    code: `# When your script has a _ready() function,
# the playground calls it automatically, just like Godot does.

func _ready():
    print("scene is ready")
    greet("world")

func greet(who: String):
    print("hello, ", who, "!")`
  },
  {
    id: "guess",
    name: "Guess the number",
    code: `# Simulated interactive game.
var target := randi_range(1, 10)
var guesses := [5, 8, 3, 7]   # pretend these come from the user

for g in guesses:
    if g == target:
        print(g, " -> YES! Got it.")
        break
    elif g < target:
        print(g, " -> higher")
    else:
        print(g, " -> lower")`
  }
];
