import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

# Initialize Presentation
prs = Presentation()
prs.slide_width = Inches(13.333)  # 16:9 widescreen
prs.slide_height = Inches(7.5)

# Color Palette
DARK_BG = RGBColor(15, 23, 42)       # Slate 900
PRIMARY = RGBColor(229, 9, 20)       # TixHub Crimson Red
SECONDARY = RGBColor(79, 70, 229)    # Indigo
ACCENT = RGBColor(16, 185, 129)      # Emerald Green
TEXT_LIGHT = RGBColor(248, 250, 252) # White/Light Slate
TEXT_MUTED = RGBColor(148, 163, 184) # Muted Grey
CARD_BG = RGBColor(30, 41, 59)       # Slate 800
CARD_BORDER = RGBColor(51, 65, 85)   # Slate 700

blank_slide_layout = prs.slide_layouts[6]

def apply_background(slide, color=DARK_BG):
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_header(slide, title_text, category_text="DBMS LAB PROJECT • REVIEW 1"):
    # Category / Breadcrumb
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
    tf_cat = cat_box.text_frame
    tf_cat.word_wrap = True
    p_cat = tf_cat.paragraphs[0]
    p_cat.text = category_text.upper()
    p_cat.font.size = Pt(11)
    p_cat.font.bold = True
    p_cat.font.color.rgb = PRIMARY
    p_cat.font.name = 'Calibri'
    
    # Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.8))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.size = Pt(24)
    p_title.font.bold = True
    p_title.font.color.rgb = TEXT_LIGHT
    p_title.font.name = 'Calibri'

def add_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=CARD_BORDER):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = border_color
    shape.line.width = Pt(1.5)
    return shape

# ==========================================
# SLIDE 1: Title Slide
# ==========================================
slide1 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide1, DARK_BG)

# Title Card
add_card(slide1, Inches(1.5), Inches(1.2), Inches(10.333), Inches(5.1), CARD_BG, PRIMARY)

title_box = slide1.shapes.add_textbox(Inches(2.0), Inches(1.8), Inches(9.333), Inches(2.2))
tf = title_box.text_frame
tf.word_wrap = True

p0 = tf.paragraphs[0]
p0.text = "TIXHUB"
p0.font.size = Pt(44)
p0.font.bold = True
p0.font.color.rgb = PRIMARY
p0.font.name = 'Calibri'
p0.alignment = PP_ALIGN.CENTER

p1 = tf.add_paragraph()
p1.text = "Online Event & Ticket Booking System"
p1.font.size = Pt(24)
p1.font.bold = True
p1.font.color.rgb = TEXT_LIGHT
p1.font.name = 'Calibri'
p1.alignment = PP_ALIGN.CENTER

p2 = tf.add_paragraph()
p2.text = "Review 1: System Design & Entity-Relationship Modeling"
p2.font.size = Pt(16)
p2.font.color.rgb = ACCENT
p2.font.name = 'Calibri'
p2.alignment = PP_ALIGN.CENTER

# Details Box
details_box = slide1.shapes.add_textbox(Inches(2.0), Inches(4.3), Inches(9.333), Inches(1.6))
tf_det = details_box.text_frame
p_det1 = tf_det.paragraphs[0]
p_det1.text = "Course: Database Management Systems Lab (30 Marks Assessment)"
p_det1.font.size = Pt(13)
p_det1.font.color.rgb = TEXT_MUTED
p_det1.alignment = PP_ALIGN.CENTER

p_det2 = tf_det.add_paragraph()
p_det2.text = "Technologies: Oracle Database 11g XE • Node.js / Express • SQL / PL-SQL • Vanilla JS"
p_det2.font.size = Pt(13)
p_det2.font.color.rgb = TEXT_LIGHT
p_det2.alignment = PP_ALIGN.CENTER

# Speaker Notes
slide1.notes_slide.notes_text_frame.text = (
    "Good morning respected professors. Today I am presenting Review 1 for TixHub, "
    "an Online Event and Ticket Booking System. In this review, I will detail our problem definition, "
    "system requirements, 3NF relational schema, and our comprehensive Entity-Relationship model."
)

# ==========================================
# SLIDE 2: Problem Definition
# ==========================================
slide2 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide2, DARK_BG)
add_header(slide2, "Problem Definition & Existing System Limitations")

cards_data_s2 = [
    ("Manual Queueing & Delay", "Physical ticket counters require customers to wait in long queues, leading to high transaction latency and poor user convenience.", PRIMARY),
    ("No Real-Time Seat Transparency", "Customers cannot view live seat occupancy maps or select specific seat rows before purchasing tickets.", SECONDARY),
    ("Concurrency & Double-Booking", "Traditional systems lack ACID transaction isolation, leading to race conditions where the same seat is sold to multiple buyers.", ACCENT),
    ("Fragmented History & Feedback", "Absence of automated cancellation mechanisms, digital booking records, and verified attendee rating calculations.", PRIMARY)
]

for idx, (title, desc, accent_color) in enumerate(cards_data_s2):
    row = idx // 2
    col = idx % 2
    x = Inches(0.8 + col * 5.95)
    y = Inches(1.6 + row * 2.6)
    
    add_card(slide2, x, y, Inches(5.65), Inches(2.3), CARD_BG, accent_color)
    tb = slide2.shapes.add_textbox(x + Inches(0.25), y + Inches(0.2), Inches(5.15), Inches(1.9))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = f"{idx+1}. {title}"
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = TEXT_LIGHT
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(13)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_before = Pt(8)

slide2.notes_slide.notes_text_frame.text = (
    "Traditional physical and unorganized ticketing channels suffer from major bottlenecks: "
    "long queues, absence of visual seat maps, race conditions leading to double bookings, "
    "and lack of automated cancellation and feedback management."
)

# ==========================================
# SLIDE 3: Objectives & Proposed Solution
# ==========================================
slide3 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide3, DARK_BG)
add_header(slide3, "Project Objectives & Proposed Solution")

objs = [
    ("Categorized Event Catalog", "Unified hub for Movies, Live Concerts, and College Festivals with date, venue, and pricing filters."),
    ("Visual Seat Reservation", "Real-time interactive cinema-style seat map with instant capacity and pricing computation."),
    ("Atomic Concurrency Control", "Oracle ACID transaction boundaries to guarantee zero double-booking under high concurrent traffic."),
    ("Role-Based Access Control", "Cryptographic authentication using Bcrypt password hashing and JWT token verification for Users & Admins."),
    ("Instant Cancellation & Ratings", "Immediate seat restoration upon cancellation and aggregate 1-5 star event ratings calculated via SQL.")
]

for idx, (title, desc) in enumerate(objs):
    y = Inches(1.6 + idx * 1.05)
    add_card(slide3, Inches(0.8), y, Inches(11.7), Inches(0.9), CARD_BG, CARD_BORDER)
    
    tb = slide3.shapes.add_textbox(Inches(1.1), y + Inches(0.12), Inches(11.1), Inches(0.7))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = f"🎯  {title}: "
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT
    
    run = p.add_run()
    run.text = desc
    run.font.bold = False
    run.font.color.rgb = TEXT_LIGHT

slide3.notes_slide.notes_text_frame.text = (
    "TixHub solves these challenges through an end-to-end relational database solution featuring "
    "categorized events, visual cinema-style seat maps, ACID transaction guarantees, role-based security, "
    "and dynamic cancellation with review aggregations."
)

# ==========================================
# SLIDE 4: Requirement Analysis
# ==========================================
slide4 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide4, DARK_BG)
add_header(slide4, "Requirement Analysis (Functional & Non-Functional)")

# Left Card: Functional
add_card(slide4, Inches(0.8), Inches(1.6), Inches(5.7), Inches(5.2), CARD_BG, PRIMARY)
tb_fn = slide4.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(5.1), Inches(4.7))
tf_fn = tb_fn.text_frame
tf_fn.word_wrap = True
p_fn_head = tf_fn.paragraphs[0]
p_fn_head.text = "⚙️  Functional Requirements"
p_fn_head.font.size = Pt(18)
p_fn_head.font.bold = True
p_fn_head.font.color.rgb = PRIMARY

fn_items = [
    "User Registration & Login with Bcrypt hashing",
    "Admin event management (CRUD operations)",
    "Real-time search, category filtering & sorting",
    "Interactive multi-seat selection & checkout",
    "One-click booking cancellation & seat release",
    "Event rating submission (1 to 5 stars)"
]
for item in fn_items:
    p = tf_fn.add_paragraph()
    p.text = f"• {item}"
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_LIGHT
    p.space_before = Pt(10)

# Right Card: Non-Functional
add_card(slide4, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2), CARD_BG, ACCENT)
tb_nfn = slide4.shapes.add_textbox(Inches(7.1), Inches(1.8), Inches(5.1), Inches(4.7))
tf_nfn = tb_nfn.text_frame
tf_nfn.word_wrap = True
p_nfn_head = tf_nfn.paragraphs[0]
p_nfn_head.text = "🛡️  Non-Functional Requirements"
p_nfn_head.font.size = Pt(18)
p_nfn_head.font.bold = True
p_nfn_head.font.color.rgb = ACCENT

nfn_items = [
    "Data Integrity: Enforce 3NF, PK, FK, and Check Constraints",
    "Concurrency & Atomicity: ACID-compliant transaction safety",
    "Security: JWT token authorization & encrypted passwords",
    "Performance: Sub-second response time via connection pooling",
    "Optimistic UI: Zero page reload latency on cancellation/ratings",
    "High Scalability: Normalized schema supporting concurrent buyers"
]
for item in nfn_items:
    p = tf_nfn.add_paragraph()
    p.text = f"• {item}"
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_LIGHT
    p.space_before = Pt(10)

slide4.notes_slide.notes_text_frame.text = (
    "Our requirement analysis separates functional features—like authentication, seat reservation, "
    "and cancellations—from non-functional guarantees including 3NF normalization, ACID transaction boundaries, "
    "and cryptographic security."
)

# ==========================================
# SLIDE 5: 3-Tier System Architecture
# ==========================================
slide5 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide5, DARK_BG)
add_header(slide5, "System Architecture & Technology Stack")

tiers = [
    ("Presentation Tier (Frontend)", "HTML5 • CSS3 (Flexbox/Grid) • Vanilla JavaScript (ES6+)\n• Interactive visual cinema seat map & optimistic DOM updates\n• Responsive layout for mobile, tablet, and desktop screens", SECONDARY),
    ("Application Tier (REST Backend)", "Node.js • Express.js • JWT Authentication • Bcrypt.js\n• Modular routing (/events, /bookings, /ratings, /auth)\n• Role-Based Access Control middleware for User & Admin sessions", PRIMARY),
    ("Database Tier (Oracle 11g XE)", "Oracle Database 11g Express Edition • Thick Mode Connection Pool\n• 5 Normalized relational tables, Check constraints, Triggers\n• Optimized SQL aggregation (LISTAGG, AVG, MERGE, atomic transactions)", ACCENT)
]

for idx, (title, content, color) in enumerate(tiers):
    y = Inches(1.6 + idx * 1.75)
    add_card(slide5, Inches(0.8), y, Inches(11.7), Inches(1.55), CARD_BG, color)
    
    tb = slide5.shapes.add_textbox(Inches(1.1), y + Inches(0.15), Inches(11.1), Inches(1.3))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = color
    
    for line in content.split('\n'):
        p_line = tf.add_paragraph()
        p_line.text = line
        p_line.font.size = Pt(12)
        p_line.font.color.rgb = TEXT_LIGHT
        p_line.space_before = Pt(3)

slide5.notes_slide.notes_text_frame.text = (
    "TixHub follows a clean 3-tier architecture: the presentation layer in HTML5/CSS3/JavaScript, "
    "the application tier built on Express.js with JWT security, and the data tier powered by Oracle 11g XE "
    "with Thick Mode connection pooling and PL/SQL triggers."
)

# ==========================================
# SLIDE 6: Database Entities & Schema Design
# ==========================================
slide6 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide6, DARK_BG)
add_header(slide6, "Database Entities, Attributes & Keys")

entities_data = [
    ("USERS", "user_id (PK)", "None", "name, email, password_hash, role, created_at"),
    ("EVENTS", "event_id (PK)", "None", "title, category, event_date, event_time, location, price, total_seats, icon"),
    ("BOOKINGS", "booking_id (PK)", "user_id (FK), event_id (FK)", "client_id, total_price, booking_date, status"),
    ("BOOKING_SEATS", "(booking_id, seat_number) PK", "booking_id (FK)", "Normalized 3NF table storing individual reserved seats"),
    ("RATINGS", "rating_id (PK)", "booking_id (FK), event_id (FK)", "rating (1 to 5), rated_at")
]

for idx, (ent, pk, fk, attrs) in enumerate(entities_data):
    y = Inches(1.6 + idx * 1.05)
    add_card(slide6, Inches(0.8), y, Inches(11.7), Inches(0.92), CARD_BG, CARD_BORDER)
    
    tb = slide6.shapes.add_textbox(Inches(1.0), y + Inches(0.1), Inches(11.3), Inches(0.75))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = f"📂  {ent}: "
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    run_pk = p.add_run()
    run_pk.text = f"[PK: {pk}]  "
    run_pk.font.bold = True
    run_pk.font.color.rgb = ACCENT
    
    if fk != "None":
        run_fk = p.add_run()
        run_fk.text = f"[FK: {fk}]  "
        run_fk.font.bold = True
        run_fk.font.color.rgb = SECONDARY
        
    p2 = tf.add_paragraph()
    p2.text = f"Attributes: {attrs}"
    p2.font.size = Pt(11.5)
    p2.font.color.rgb = TEXT_MUTED

slide6.notes_slide.notes_text_frame.text = (
    "Our database schema consists of 5 entities. Notably, BOOKING_SEATS is decomposed into an associative "
    "entity with a composite primary key to adhere to Third Normal Form (3NF), eliminating multi-valued seat dependencies."
)

# ==========================================
# SLIDE 7: Entity-Relationship (ER) Diagram
# ==========================================
slide7 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide7, DARK_BG)
add_header(slide7, "Entity-Relationship (E-R) Model")

# Diagram visual card / Image
add_card(slide7, Inches(0.8), Inches(1.5), Inches(11.733), Inches(5.4), RGBColor(255, 255, 255), SECONDARY)
img_path = r"C:\Users\bored\OneDrive\Desktop\Oracle\dbs_pro\TixHub_ER_Diagram.png"
slide7.shapes.add_picture(img_path, Inches(1.0), Inches(1.65), width=Inches(11.333))

slide7.notes_slide.notes_text_frame.text = (
    "This slide demonstrates our E-R diagram. Users place bookings in a 1-to-many relationship. "
    "Events link to bookings in a 1-to-many relationship. Each booking reserves multiple seats in BOOKING_SEATS, "
    "and confirmed bookings can optionally submit a rating evaluating the event."
)

# ==========================================
# SLIDE 8: Normalization & Constraints
# ==========================================
slide8 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide8, DARK_BG)
add_header(slide8, "Database Normalization (3NF) & Integrity Constraints")

# Left: Normalization
add_card(slide8, Inches(0.8), Inches(1.6), Inches(5.7), Inches(5.2), CARD_BG, ACCENT)
tb_norm = slide8.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(5.1), Inches(4.7))
tf_norm = tb_norm.text_frame
tf_norm.word_wrap = True

p_n_head = tf_norm.paragraphs[0]
p_n_head.text = "📐  Normalization (1NF → 2NF → 3NF)"
p_n_head.font.size = Pt(17)
p_n_head.font.bold = True
p_n_head.font.color.rgb = ACCENT

norm_points = [
    "1NF (First Normal Form): Atomic column values; eradicated multi-valued booked seat arrays into individual rows.",
    "2NF (Second Normal Form): Full functional dependency; in BOOKING_SEATS, attributes depend on the entire composite key (booking_id, seat_number).",
    "3NF (Third Normal Form): Eradicated transitive dependencies; user credentials and event metadata exist solely in their primary entity tables."
]
for pt in norm_points:
    p = tf_norm.add_paragraph()
    p.text = f"• {pt}"
    p.font.size = Pt(12.5)
    p.font.color.rgb = TEXT_LIGHT
    p.space_before = Pt(8)

# Right: Integrity Constraints
add_card(slide8, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2), CARD_BG, PRIMARY)
tb_con = slide8.shapes.add_textbox(Inches(7.1), Inches(1.8), Inches(5.1), Inches(4.7))
tf_con = tb_con.text_frame
tf_con.word_wrap = True

p_c_head = tf_con.paragraphs[0]
p_c_head.text = "🔒  Database Integrity Constraints"
p_c_head.font.size = Pt(17)
p_c_head.font.bold = True
p_c_head.font.color.rgb = PRIMARY

con_points = [
    "PRIMARY KEY: Unique identifiers on users, events, bookings, and ratings.",
    "FOREIGN KEY: Enforced referential integrity across all relationships.",
    "CHECK (role IN ('admin', 'user')): Strict RBAC domain enforcement.",
    "CHECK (rating BETWEEN 1 AND 5): Rating value validation.",
    "CHECK (status IN ('confirmed', 'cancelled')): Booking status validation.",
    "TRIGGERS & SEQUENCES: Automated key generation for Oracle 11g XE."
]
for pt in con_points:
    p = tf_con.add_paragraph()
    p.text = f"• {pt}"
    p.font.size = Pt(12.5)
    p.font.color.rgb = TEXT_LIGHT
    p.space_before = Pt(8)

slide8.notes_slide.notes_text_frame.text = (
    "Our schema strictly adheres to 3NF normalization to prevent insertion, update, and deletion anomalies. "
    "Integrity constraints including primary keys, foreign keys, and domain check constraints guarantee data validity."
)

# ==========================================
# SLIDE 9: Review 2 Implementation Plan
# ==========================================
slide9 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide9, DARK_BG)
add_header(slide9, "Implementation Roadmap for Review 2")

r2_items = [
    ("Advanced SQL Queries & Analytical Aggregations", "Implementing LISTAGG, AVG, GROUP BY, and multi-table JOINs for live seat matrices and ratings."),
    ("Atomic Transaction Checkout Engine", "Multi-statement checkout execution with Oracle COMMIT / ROLLBACK semantics preventing race conditions."),
    ("Database Views & Indexing Optimization", "Creating materialized views for active bookings and B-Tree indexes on search keywords and foreign keys."),
    ("Full End-to-End API Integration", "Complete validation of frontend user flows with backend Oracle connection pooling and security tests.")
]

for idx, (title, desc) in enumerate(r2_items):
    y = Inches(1.6 + idx * 1.3)
    add_card(slide9, Inches(0.8), y, Inches(11.7), Inches(1.15), CARD_BG, SECONDARY)
    
    tb = slide9.shapes.add_textbox(Inches(1.1), y + Inches(0.12), Inches(11.1), Inches(0.9))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = f"🚀  Phase {idx+1}: {title}"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = TEXT_LIGHT
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(12.5)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_before = Pt(3)

slide9.notes_slide.notes_text_frame.text = (
    "In Review 2, we will present the practical implementation: atomic checkout transactions, "
    "analytical queries with LISTAGG and AVG, index tuning, and full frontend-to-database integration."
)

# ==========================================
# SLIDE 10: Conclusion & Q&A
# ==========================================
slide10 = prs.slides.add_slide(blank_slide_layout)
apply_background(slide10, DARK_BG)

add_card(slide10, Inches(2.0), Inches(1.5), Inches(9.333), Inches(4.5), CARD_BG, PRIMARY)

tb_end = slide10.shapes.add_textbox(Inches(2.5), Inches(2.2), Inches(8.333), Inches(3.2))
tf_end = tb_end.text_frame
tf_end.word_wrap = True

p_thx = tf_end.paragraphs[0]
p_thx.text = "THANK YOU!"
p_thx.font.size = Pt(44)
p_thx.font.bold = True
p_thx.font.color.rgb = PRIMARY
p_thx.alignment = PP_ALIGN.CENTER

p_sub = tf_end.add_paragraph()
p_sub.text = "TixHub — High-Performance Event & Ticket Booking System"
p_sub.font.size = Pt(20)
p_sub.font.bold = True
p_sub.font.color.rgb = TEXT_LIGHT
p_sub.alignment = PP_ALIGN.CENTER
p_sub.space_before = Pt(10)

p_qa = tf_end.add_paragraph()
p_qa.text = "Questions & Feedback are Welcome"
p_qa.font.size = Pt(16)
p_qa.font.color.rgb = ACCENT
p_qa.alignment = PP_ALIGN.CENTER
p_qa.space_before = Pt(15)

slide10.notes_slide.notes_text_frame.text = (
    "Thank you for your time and attention. I am now open to any questions or suggestions from the faculty."
)

# Save the presentation
output_path = r"C:\Users\bored\OneDrive\Desktop\Oracle\dbs_pro\TixHub_Review1_Presentation.pptx"
prs.save(output_path)
print(f"Presentation saved successfully to: {output_path}")
