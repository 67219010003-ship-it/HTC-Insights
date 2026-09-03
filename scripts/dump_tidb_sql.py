import os
import sys
from dotenv import load_dotenv

workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(workspace, "backend", ".env"))
load_dotenv(os.path.join(workspace, ".env"))

sys.path.insert(0, os.path.join(workspace, "backend"))
import database as db
from sqlalchemy import text

tables = [
    'users', 'companies', 'employers', 'job_postings', 'reviews', 'review_photos',
    'community_posts', 'community_comments', 'community_likes', 'notifications',
    'reports', 'upgrade_requests', 'audit_logs'
]

output_path = os.path.join(workspace, "database", "htc_insights.sql")

print("Generating clean TiDB SQL dump...")
with open(output_path, "w", encoding="utf-8") as f:
    f.write("-- ========================================================\n")
    f.write("-- ระบบฐานข้อมูล HTC Insight (TiDB Cloud Compatible Full Dump)\n")
    f.write("-- Clean Architecture: 12 Tables (Real Name Display 100%)\n")
    f.write("-- Default Schema: `test`\n")
    f.write("-- ========================================================\n\n")
    f.write("SET NAMES utf8mb4;\n")
    f.write("SET FOREIGN_KEY_CHECKS = 0;\n\n")
    f.write("USE `test`;\n\n")

    with db.engine.connect() as conn:
        for t in reversed(tables):
            f.write(f"DROP TABLE IF EXISTS `{t}`;\n")
        f.write("\n")

        for t in tables:
            try:
                res = conn.execute(text(f"SHOW CREATE TABLE `{t}`")).fetchone()
                create_sql = res[1]
                f.write(f"-- --------------------------------------------------------\n")
                f.write(f"-- ตาราง `{t}`\n")
                f.write(f"-- --------------------------------------------------------\n")
                f.write(f"{create_sql};\n\n")

                rows = conn.execute(text(f"SELECT * FROM `{t}`")).fetchall()
                if rows:
                    cols = [c[0] for c in conn.execute(text(f"DESCRIBE `{t}`")).fetchall()]
                    cols_str = ", ".join([f"`{c}`" for c in cols])
                    f.write(f"-- ข้อมูลตาราง `{t}` ({len(rows)} แถว)\n")
                    f.write(f"INSERT INTO `{t}` ({cols_str}) VALUES\n")
                    val_strs = []
                    for r in rows:
                        escaped_vals = []
                        for v in r:
                            if v is None:
                                escaped_vals.append("NULL")
                            elif isinstance(v, (int, float)):
                                escaped_vals.append(str(v))
                            elif isinstance(v, bool):
                                escaped_vals.append("1" if v else "0")
                            else:
                                sv = str(v).replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r")
                                escaped_vals.append(f"'{sv}'")
                        val_strs.append("  (" + ", ".join(escaped_vals) + ")")
                    f.write(",\n".join(val_strs) + ";\n\n")
            except Exception as e:
                print(f"Error dumping {t}:", e)

    f.write("SET FOREIGN_KEY_CHECKS = 1;\n")

print(f"Clean TiDB SQL dump successfully written to: {output_path}")
