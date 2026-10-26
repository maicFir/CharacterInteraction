"""Original code-drawn vector scenery and 42-frame character sprite sheet.

No external character images, models, or generative image services are used.
Run from the repository root. Audio is prepared separately with Piper.
"""

import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps/web/public/art"
OUT.mkdir(parents=True, exist_ok=True)


def write(name, body, width, height):
    (OUT / name).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">{body}</svg>'
    )


# A rain-soaked, softly illuminated cafe. All geometry is authored here.
windows = ""
for x in [590, 870, 1150]:
    windows += f'''<rect x="{x}" y="50" width="250" height="650" fill="url(#window)" stroke="#374a41" stroke-width="14"/>
    <path d="M{x + 125} 50V700 M{x} 360h250" stroke="#293c34" stroke-width="11"/>
    <path d="M{x + 20} 80V670" stroke="#77927b" opacity=".15" stroke-width="2"/>'''
    for j in range(18):
        dx = x + 12 + (j * 71) % 225
        y = 75 + (j * 57) % 580
        windows += f'<path d="M{dx} {y}l-6 28" stroke="#a5b8a0" opacity="{0.06 + (j % 3) * 0.035}" stroke-width="1.5"/>'
city = ""
for x, y, w, h in [
    (610, 190, 45, 410),
    (670, 245, 70, 350),
    (765, 310, 50, 300),
    (890, 230, 85, 420),
    (990, 160, 110, 480),
    (1170, 275, 60, 340),
    (1270, 180, 95, 460),
]:
    city += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#233e3a" opacity=".55"/>'
    for k in range(5):
        city += f'<rect x="{x + 12}" y="{y + 30 + k * 55}" width="9" height="14" rx="2" fill="#ceb773" opacity="{0.15 + (k % 3) * 0.1}"/>'
plants = ""
for i in range(13):
    angle = -140 + i * 13
    endx = 1390 + math.cos(math.radians(angle)) * 110
    endy = 650 + math.sin(math.radians(angle)) * 185
    plants += f'<path d="M1390 760Q{endx - 20} {endy + 40} {endx:.1f} {endy:.1f}" stroke="#52624a" stroke-width="3" fill="none"/><ellipse cx="{endx:.1f}" cy="{endy:.1f}" rx="18" ry="47" transform="rotate({angle + 90} {endx:.1f} {endy:.1f})" fill="{["#3d5541", "#4a6249", "#344c3b"][i % 3]}"/>'
write(
    "cafe.svg",
    f"""
<defs><linearGradient id="wall" x2="1" y2="1"><stop stop-color="#1b302c"/><stop offset="1" stop-color="#304137"/></linearGradient>
<linearGradient id="window" x2="0" y2="1"><stop stop-color="#142e32"/><stop offset=".7" stop-color="#3a5149"/><stop offset="1" stop-color="#65745a"/></linearGradient>
<radialGradient id="lamp"><stop stop-color="#f8db91" stop-opacity=".6"/><stop offset="1" stop-color="#dcc28a" stop-opacity="0"/></radialGradient>
<linearGradient id="wood" x2="0" y2="1"><stop stop-color="#6c5a3e"/><stop offset="1" stop-color="#3a3a29"/></linearGradient></defs>
<rect width="1600" height="1100" fill="url(#wall)"/>
<path d="M0 800H1600V1100H0Z" fill="#2b382d"/>
{windows}<g>{city}</g>
<path d="M600 610h790v80H600Z" fill="#799078" opacity=".06"/>
<path d="M570 715h840v30H570Z" fill="#596045"/>
<path d="M559 746h865v10H559Z" fill="#1a2b23"/>
<rect x="70" y="180" width="310" height="330" rx="2" fill="#1a2c25" stroke="#46513b" stroke-width="8"/>
<rect x="93" y="204" width="264" height="282" fill="#283c30"/>
<text x="225" y="270" text-anchor="middle" fill="#a4ac87" font-family="Georgia,serif" font-size="24" letter-spacing="5">SLOW HOURS</text>
<path d="M146 300h158M174 342h104M163 375h126M181 408h90" stroke="#88997a" stroke-width="2" opacity=".4"/>
<path d="M40 590h400v18H40Z" fill="#26362a"/>
<g fill="#959c73"><path d="M90 552h23l-4 37H94Z"/><path d="M139 556h18l-2 32h-13Z"/></g>
<path d="M140 120V0M140 120 60 215h160Z" fill="#344535" stroke="#1d2e26" stroke-width="4"/>
<ellipse cx="140" cy="215" rx="80" ry="12" fill="#c3a768"/>
<ellipse cx="140" cy="300" rx="280" ry="240" fill="url(#lamp)"/>
<path d="M1000 0V85" stroke="#172b23" stroke-width="5"/><path d="M1000 85 925 165h150Z" fill="#293e30"/>
<ellipse cx="1000" cy="166" rx="75" ry="10" fill="#dfc583"/><ellipse cx="1000" cy="265" rx="260" ry="200" fill="url(#lamp)"/>
{plants}<path d="M1340 760h100l-15 125h-70Z" fill="#5c6044"/>
<path d="M0 897 1600 855v55L0 947Z" fill="url(#wood)"/>
<path d="M0 900 1600 858" stroke="#b1a071" opacity=".2" stroke-width="3"/>
<ellipse cx="520" cy="876" rx="60" ry="12" fill="#222c22"/>
<ellipse cx="520" cy="868" rx="52" ry="10" fill="#aaa98a"/>
<path d="M490 819h59l-5 42q-23 14-48 0Z" fill="#c7c4a4"/><ellipse cx="519" cy="819" rx="29" ry="7" fill="#514c36"/>
<path d="M549 827q25-3 16 19q-6 9-19 6" fill="none" stroke="#c7c4a4" stroke-width="7"/>
<path d="M512 795q-8-15 2-28m12 31q10-15 0-27" stroke="#bec8ae" stroke-width="2" opacity=".2" fill="none"/>
""",
    1600,
    1100,
)


def character(row, frame):
    mood = ["calm", "curious", "sad", "calm", "curious", "curious", "calm"][row]
    shift = [0, 1, 2, 1, 0, -1][frame]
    look = row == 3
    offer = row == 4
    eye_x = -5 if look else 0
    brow = 9 if mood == "sad" else -9 if mood == "curious" else 0
    mouth = [0, 3, 7, 4, 2, 6][frame] if row < 3 else [0, 1, 2, 1, 0, 1][frame]
    head_rot = -4 if look else -2 if row == 5 else 2 if row == 6 else 0
    hand_offset = [0, -8, -16, -22, -16, -8][frame] if offer else 0
    return f'''<g transform="translate(0 {shift})">
    <path d="M123 301Q93 405 71 695h345q-7-170-51-354Z" fill="#b38e46"/>
    <path d="M139 292q-46 32-56 122L64 648q17 28 51 7l42-223" fill="#b8974f" stroke="#94783f" stroke-width="2"/>
    <path d="M328 298q42 10 55 68l39 240q-10 40-41 30l-40-200" fill="#a88440" stroke="#94783f" stroke-width="2"/>
    <path d="M198 275h88l12 62-63 41-58-40Z" fill="#ddba92"/>
    <path d="m190 292 49 57-49 66-50-105Z" fill="#d4b36a"/><path d="m288 290-49 59 48 63 51-100Z" fill="#c4a053"/>
    <path d="M239 350v345" stroke="#e2c47b" stroke-width="3"/>
    <path d="M242 375v304" stroke="#8e713c" opacity=".6"/>
    <path d="M139 480h58v70h-58Z" fill="#ad8840" stroke="#a17d3c" stroke-width="2"/>
    <path d="M287 480h58v70h-58Z" fill="#a8843d" stroke="#94733a" stroke-width="2"/>
    <path d="m275 346 34 130" stroke="#4b4832" stroke-width="16"/>
    <g transform="rotate({head_rot} 238 220)">
    <path d="M135 218q-9-113 38-147q71-46 132 2q48 32 37 157l-3 102q-40-1-54-45l-94 9q-29 41-63 40Z" fill="#302d29"/>
    <path d="M159 155q2-75 76-76q82 3 82 84l-7 71q-17 59-72 73q-61-13-79-74Z" fill="#e5c5a3"/>
    <ellipse cx="158" cy="218" rx="12" ry="22" fill="#d8b38e"/><ellipse cx="315" cy="218" rx="11" ry="22" fill="#d6b18c"/>
    <path d="M148 187q5-96 72-99q-21 59-69 94l-4 84-13-48Z" fill="#37322c"/>
    <path d="M211 88q59-35 99 19q27 33 13 109l-8 49-13-93q-53-12-91-84Z" fill="#37322c"/>
    <path d="M173 171q17-8 36 {brow}" stroke="#74604c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M263 {170 + brow / 2}q18-5 34 4" stroke="#74604c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M175 198q15-8 30 0M267 198q15-8 29 0" stroke="#504737" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="{192 + eye_x}" cy="200" rx="4.5" ry="{8 if mood == "curious" else 4 if mood == "sad" else 6}" fill="#4b4837"/><ellipse cx="{280 + eye_x}" cy="200" rx="4.5" ry="{8 if mood == "curious" else 4 if mood == "sad" else 6}" fill="#4b4837"/>
    <circle cx="{193 + eye_x}" cy="198" r="1.3" fill="#ebdbc0"/><circle cx="{281 + eye_x}" cy="198" r="1.3" fill="#ebdbc0"/>
    <path d="m238 205-5 27 9 3" fill="none" stroke="#c29878" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="181" cy="231" rx="15" ry="6" fill="#c9907c" opacity=".2"/><ellipse cx="291" cy="230" rx="13" ry="6" fill="#c9907c" opacity=".2"/>
    {f'<ellipse cx="239" cy="258" rx="{9 + mouth * 0.5}" ry="{mouth}" fill="#8e6253"/>' if mouth else f'<path d="M226 255q13 {-10 if mood == "sad" else 14 if mood == "curious" else 8} 26-1" fill="none" stroke="#a67460" stroke-width="2.5" stroke-linecap="round"/>'}
    <path d="M308 136l-17 28" stroke="#b4b8ab" stroke-width="3"/>
    <path d="m306 139 3 7 8 1-6 5 1 8-7-4-7 4 1-8-6-5 9-1Z" fill="#d0d4c5"/>
    <path d="M148 225q-10 69-7 109M321 226q10 69 4 112" stroke="#464034" stroke-width="7" fill="none"/>
    </g>
    <path d="M202 437h91q9 0 9 10v55q0 8-9 8h-91q-10 0-10-8v-55q0-10 10-10" fill="#333b31"/>
    <rect x="210" y="427" width="28" height="13" rx="2" fill="#3a4133"/>
    <circle cx="258" cy="474" r="28" fill="#60644d"/><circle cx="258" cy="474" r="21" fill="#1d302c"/><circle cx="258" cy="474" r="13" fill="#334943"/><circle cx="252" cy="468" r="5" fill="#7b9685" opacity=".5"/>
    <rect x="200" y="446" width="15" height="7" rx="1" fill="#b6b391"/>
    <g transform="translate({-hand_offset / 2} {hand_offset})">
    {'<path d="M361 564q-31-28-60-20l-24 23q-9 13 9 19l27-8 41 26Z" fill="#d8b38e"/><rect x="268" y="478" width="70" height="81" rx="1" fill="#e4ddc3" transform="rotate(-13 300 520)"/><path d="m276 502 49-10 9 43-49 10Z" fill="#688c84"/><path d="m283 527 17-17 13 10 12-9 7 22-47 10Z" fill="#bcc9ad"/>' if offer else '<path d="M374 610q-10 34-2 56 11 12 21-4l7-33Z" fill="#d8b38e"/>'}
    </g>
    <path d="M82 641q-7 23 0 39q7 13 15 1l9-31" fill="#dfba91"/>
    <path d="M79 688h335v32H79Z" fill="#9b7c3b"/>
    </g>'''


sprites = ""
for row in range(7):
    for frame in range(6):
        sprites += (
            f'<g transform="translate({frame * 480} {row * 720})">{character(row, frame)}</g>'
        )
write("mira-sprites.svg", sprites, 2880, 5040)
write(
    "seaside.svg",
    """<defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#8aa8a3"/><stop offset="1" stop-color="#e4d8ad"/></linearGradient></defs><rect width="600" height="450" fill="url(#s)"/><circle cx="420" cy="105" r="34" fill="#e9ddb0"/><path d="M0 210q100-20 200 0t200 0t200 0v240H0Z" fill="#648981"/><path d="M0 280q100-30 200 0t200 0t200 0M0 330q100-25 200 0t200 0t200 0M0 380q100-25 200 0t200 0t200 0" stroke="#c9d3b9" stroke-width="4" fill="none" opacity=".7"/><path d="m0 390 160-75 60 135H0Z" fill="#4c6556"/><path d="M115 320h44l-7-130h-29Z" fill="#ddd7b9"/><path d="M119 190h38v-22h-38Z" fill="#536c5c"/><path d="m114 166 25-25 24 25Z" fill="#455f51"/><path d="M132 173h13v12h-13Z" fill="#f0d9a2"/>""",
    600,
    450,
)
print(f"Created cafe, seaside, and 42 character frames in {OUT}")
