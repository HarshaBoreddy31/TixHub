import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path
import numpy as np

# Set figure size and resolution
fig, ax = plt.subplots(figsize=(19, 12), dpi=300)
ax.set_xlim(0, 190)
ax.set_ylim(0, 120)
ax.axis('off')

# Title
ax.text(8, 114, 'E-R Model — TixHub Ticketing Platform', fontsize=20, fontweight='bold', fontfamily='sans-serif', color='#0f172a')

# Color Scheme (Matching the reference style)
C_ENTITY_BG_GREEN = '#dcfce7'
C_ENTITY_BORDER_GREEN = '#15803d'

C_ENTITY_BG_BLUE = '#e0f2fe'
C_ENTITY_BORDER_BLUE = '#0369a1'

C_ENTITY_BG_ROSE = '#fce7f3'
C_ENTITY_BORDER_ROSE = '#be185d'

C_ENTITY_BG_YELLOW = '#fef3c7'
C_ENTITY_BORDER_YELLOW = '#b45309'

C_ENTITY_BG_PURPLE = '#ede9fe'
C_ENTITY_BORDER_PURPLE = '#6d28d9'

C_REL_BG = '#f3e8ff'
C_REL_BORDER = '#7e22ce'

C_ATTR_BG = '#f8fafc'
C_ATTR_BORDER = '#475569'

def draw_entity(x, y, w, h, name, pk_name, bg_color, border_color):
    rect = patches.FancyBboxPatch((x - w/2, y - h/2), w, h,
                                  boxstyle="round,pad=0.2,rounding_size=1.2",
                                  facecolor=bg_color, edgecolor=border_color, linewidth=1.8, zorder=3)
    ax.add_patch(rect)
    ax.text(x, y + 1.2, name, ha='center', va='center', fontsize=11, fontweight='bold', color='#0f172a', zorder=4)
    ax.text(x, y - 2.0, f"({pk_name})", ha='center', va='center', fontsize=9.5, fontweight='bold', color='#1e293b', zorder=4)

def draw_diamond(x, y, w, h, text):
    pts = [[x, y + h/2], [x + w/2, y], [x, y - h/2], [x - w/2, y]]
    poly = patches.Polygon(pts, closed=True, facecolor=C_REL_BG, edgecolor=C_REL_BORDER, linewidth=1.6, zorder=3)
    ax.add_patch(poly)
    ax.text(x, y, text, ha='center', va='center', fontsize=9.5, fontweight='bold', color='#581c87', zorder=4)

def draw_attribute(x, y, rx, ry, text, is_pk=False, is_dashed=False):
    ls = '--' if is_dashed else '-'
    ellipse = patches.Ellipse((x, y), rx * 2, ry * 2, facecolor=C_ATTR_BG, edgecolor=C_ATTR_BORDER,
                              linestyle=ls, linewidth=1.3, zorder=3)
    ax.add_patch(ellipse)
    fontweight = 'bold' if is_pk else 'normal'
    
    t = ax.text(x, y, text, ha='center', va='center', fontsize=8.5, fontweight=fontweight, color='#0f172a', zorder=4)
    if is_pk:
        # Draw underline for PK
        renderer = fig.canvas.get_renderer() if hasattr(fig.canvas, 'get_renderer') else None
        # Underline offset
        ax.plot([x - rx*0.65, x + rx*0.65], [y - 1.3, y - 1.3], color='#0f172a', lw=1.2, zorder=4)

def connect(p1, p2, color='#64748b', lw=1.3, ls='-', zorder=2):
    ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color=color, lw=lw, linestyle=ls, zorder=zorder)

def add_label(x, y, text):
    ax.text(x, y, text, ha='center', va='center', fontsize=10.5, fontweight='bold', color='#0f172a', zorder=5)

# =========================================================================
# ENTITY POSITIONS
# =========================================================================
USERS_POS = (38, 92)
EVENTS_POS = (142, 92)
BOOKINGS_POS = (90, 58)
SEATS_POS = (45, 22)
RATINGS_POS = (145, 22)

# =========================================================================
# 1. USERS ENTITY & ATTRIBUTES
# =========================================================================
draw_entity(USERS_POS[0], USERS_POS[1], 24, 9, "USERS", "UserID", C_ENTITY_BG_GREEN, C_ENTITY_BORDER_GREEN)

user_attrs = [
    ((18, 106), 8, 3.5, "UserID", True),
    ((38, 110), 8, 3.5, "Name", False),
    ((58, 106), 8, 3.5, "Email", False),
    ((15, 92), 9, 3.5, "PasswordHash", False),
    ((17, 78), 7, 3.5, "Role", False),
    ((38, 76), 9, 3.5, "CreatedAt", False)
]
for pos, rx, ry, name, is_pk in user_attrs:
    connect(USERS_POS, pos)
    draw_attribute(pos[0], pos[1], rx, ry, name, is_pk=is_pk)

# =========================================================================
# 2. EVENTS ENTITY & ATTRIBUTES
# =========================================================================
draw_entity(EVENTS_POS[0], EVENTS_POS[1], 24, 9, "EVENTS", "EventID", C_ENTITY_BG_BLUE, C_ENTITY_BORDER_BLUE)

event_attrs = [
    ((122, 110), 8, 3.5, "EventID", True),
    ((142, 112), 7.5, 3.5, "Title", False),
    ((162, 110), 8.5, 3.5, "Category", False),
    ((178, 98), 8.5, 3.5, "EventDate", False),
    ((178, 86), 8.5, 3.5, "EventTime", False),
    ((165, 76), 8, 3.5, "Location", False),
    ((145, 76), 6.5, 3.5, "Price", False),
    ((125, 76), 8, 3.5, "TotalSeats", False)
]
for pos, rx, ry, name, is_pk in event_attrs:
    connect(EVENTS_POS, pos)
    draw_attribute(pos[0], pos[1], rx, ry, name, is_pk=is_pk)

# =========================================================================
# 3. BOOKINGS ENTITY & ATTRIBUTES
# =========================================================================
draw_entity(BOOKINGS_POS[0], BOOKINGS_POS[1], 26, 9, "BOOKINGS", "BookingID", C_ENTITY_BG_ROSE, C_ENTITY_BORDER_ROSE)

booking_attrs = [
    ((70, 72), 8.5, 3.5, "BookingID", True),
    ((110, 72), 8, 3.5, "ClientID", False),
    ((68, 44), 8.5, 3.5, "TotalPrice", False),
    ((90, 42), 9, 3.5, "BookingDate", False),
    ((112, 44), 7.5, 3.5, "Status", False)
]
for pos, rx, ry, name, is_pk in booking_attrs:
    connect(BOOKINGS_POS, pos)
    draw_attribute(pos[0], pos[1], rx, ry, name, is_pk=is_pk)

# =========================================================================
# 4. BOOKING_SEATS ENTITY & ATTRIBUTES
# =========================================================================
draw_entity(SEATS_POS[0], SEATS_POS[1], 26, 9, "BOOKING_SEATS", "BookingID, SeatNo", C_ENTITY_BG_YELLOW, C_ENTITY_BORDER_YELLOW)

seat_attrs = [
    ((22, 22), 9.5, 3.5, "SeatNumber", True),
    ((45, 9), 9.5, 3.5, "BookingID", True)
]
for pos, rx, ry, name, is_pk in seat_attrs:
    connect(SEATS_POS, pos)
    draw_attribute(pos[0], pos[1], rx, ry, name, is_pk=is_pk)

# =========================================================================
# 5. RATINGS ENTITY & ATTRIBUTES
# =========================================================================
draw_entity(RATINGS_POS[0], RATINGS_POS[1], 24, 9, "RATINGS", "RatingID", C_ENTITY_BG_PURPLE, C_ENTITY_BORDER_PURPLE)

rating_attrs = [
    ((168, 22), 8.5, 3.5, "RatingID", True),
    ((145, 9), 8, 3.5, "Rating", False),
    ((125, 10), 8, 3.5, "RatedAt", False)
]
for pos, rx, ry, name, is_pk in rating_attrs:
    connect(RATINGS_POS, pos)
    draw_attribute(pos[0], pos[1], rx, ry, name, is_pk=is_pk)

# =========================================================================
# RELATIONSHIPS & CARDINALITIES
# =========================================================================

# 1. USERS -- <Places> -- BOOKINGS
REL_PLACES = (58, 75)
draw_diamond(REL_PLACES[0], REL_PLACES[1], 16, 7.5, "Places")
connect(USERS_POS, REL_PLACES)
connect(REL_PLACES, BOOKINGS_POS)
add_label(44, 83, "1")
add_label(76, 68, "N")

# 2. EVENTS -- <Includes / For> -- BOOKINGS
REL_FOR = (122, 75)
draw_diamond(REL_FOR[0], REL_FOR[1], 16, 7.5, "For")
connect(EVENTS_POS, REL_FOR)
connect(REL_FOR, BOOKINGS_POS)
add_label(135, 83, "1")
add_label(104, 68, "N")

# 3. BOOKINGS -- <Reserves> -- BOOKING_SEATS
REL_RESERVES = (66, 38)
draw_diamond(REL_RESERVES[0], REL_RESERVES[1], 17, 7.5, "Reserves")
connect(BOOKINGS_POS, REL_RESERVES)
connect(REL_RESERVES, SEATS_POS)
add_label(78, 49, "1")
add_label(54, 29, "N")

# 4. BOOKINGS -- <Rates> -- RATINGS
REL_RATES = (118, 38)
draw_diamond(REL_RATES[0], REL_RATES[1], 16, 7.5, "Rates")
connect(BOOKINGS_POS, REL_RATES)
connect(REL_RATES, RATINGS_POS)
add_label(102, 49, "1")
add_label(133, 29, "1")

# 5. EVENTS -- <Evaluated By> -- RATINGS (dashed contextual connection)
connect(EVENTS_POS, (162, 58), color='#94a3b8', ls=':')
connect((162, 58), RATINGS_POS, color='#94a3b8', ls=':')
REL_EVAL = (162, 58)
draw_diamond(REL_EVAL[0], REL_EVAL[1], 18, 7.5, "Evaluates")
add_label(154, 80, "1")
add_label(156, 35, "N")

# =========================================================================
# LEGEND BOX (Bottom Left)
# =========================================================================
leg_box = patches.FancyBboxPatch((6, 3), 32, 28, boxstyle="round,pad=0.2,rounding_size=1",
                                 facecolor='#ffffff', edgecolor='#cbd5e1', linewidth=1.4, zorder=2)
ax.add_patch(leg_box)
ax.text(8, 28, "Legend", fontsize=10.5, fontweight='bold', color='#334155')

# Entity sample
ax.add_patch(patches.FancyBboxPatch((8, 22), 6, 3.2, boxstyle="round,pad=0.1", facecolor=C_ENTITY_BG_GREEN, edgecolor=C_ENTITY_BORDER_GREEN, lw=1.2))
ax.text(17, 23.5, "Entity", fontsize=9, va='center', color='#334155')

# Relationship sample
pts_leg = [[11, 20.5], [14, 18.5], [11, 16.5], [8, 18.5]]
ax.add_patch(patches.Polygon(pts_leg, closed=True, facecolor=C_REL_BG, edgecolor=C_REL_BORDER, lw=1.2))
ax.text(17, 18.5, "Relationship", fontsize=9, va='center', color='#334155')

# Attribute sample
ax.add_patch(patches.Ellipse((11, 13.5), 6, 3, facecolor=C_ATTR_BG, edgecolor=C_ATTR_BORDER, lw=1.2))
ax.text(17, 13.5, "Attribute", fontsize=9, va='center', color='#334155')

# Underlined PK sample
ax.text(8, 8.5, "Underlined = Primary Key", fontsize=8.5, fontweight='bold', color='#1e293b')
ax.plot([8, 27], [7.5, 7.5], color='#1e293b', lw=1.2)

# Dashed sample
ax.text(8, 4.5, "- - - Derived / Foreign Link", fontsize=8.5, color='#64748b')

plt.tight_layout()
output_img = r"C:\Users\bored\OneDrive\Desktop\Oracle\dbs_pro\TixHub_ER_Diagram.png"
output_svg = r"C:\Users\bored\OneDrive\Desktop\Oracle\dbs_pro\TixHub_ER_Diagram.svg"
plt.savefig(output_img, dpi=300, bbox_inches='tight')
plt.savefig(output_svg, bbox_inches='tight')
plt.close()
print(f"Diagram successfully generated at:\nPNG: {output_img}\nSVG: {output_svg}")
