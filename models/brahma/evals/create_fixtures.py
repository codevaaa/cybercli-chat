from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUTPUT = Path(__file__).resolve().parent / "fixtures" / "settings-screen.png"


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (1360, 900), "#f6f4f1")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=25)
    title = ImageFont.load_default(size=42)
    draw.rounded_rectangle((0, 0, 1360, 92), radius=0, fill="#ffffff")
    draw.text((68, 28), "Workspace", fill="#26313b", font=font)
    draw.text((1130, 29), "JD", fill="#39434d", font=font)
    draw.rounded_rectangle((52, 142, 260, 842), radius=18, fill="#ffffff", outline="#ddd9d3")
    for index, text in enumerate(["Overview", "Projects", "Account settings", "Help"]):
        draw.text((80, 190 + index * 72), text, fill="#28323d", font=font)
    draw.text((320, 148), "Account Settings", fill="#18222d", font=title)
    draw.text((320, 220), "Manage your profile and sign-in details.", fill="#56616b", font=font)
    draw.rounded_rectangle((316, 296, 1295, 812), radius=18, fill="#ffffff", outline="#dedad5")
    for left, top, label, value in [
        (360, 354, "Full name", "Jordan Doe"),
        (830, 354, "Email", "jordan@example.com"),
        (360, 510, "Password", "••••••••••"),
        (830, 510, "Time zone", "Pacific Time (UTC-8)"),
    ]:
        draw.text((left, top), label, fill="#27313a", font=font)
        draw.rounded_rectangle((left, top + 39, left + 410, top + 99), radius=8, fill="#ffffff", outline="#bdc3c9", width=2)
        draw.text((left + 14, top + 55), value, fill="#555e67", font=font)
    draw.rounded_rectangle((360, 700, 550, 760), radius=10, fill="#d97757")
    draw.text((382, 718), "Save changes", fill="#ffffff", font=font)
    image.save(OUTPUT, format="PNG")
    print(OUTPUT)


if __name__ == "__main__":
    main()
