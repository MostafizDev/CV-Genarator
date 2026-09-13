from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

import models
from services.pdf.templates import BUILTIN_CV_TEMPLATES, BUILTIN_COVER_LETTER_TEMPLATES


def seed_builtin_templates(engine: Engine) -> None:
    """Ensures every built-in template (see services/pdf/templates.py's
    BUILTIN_CV_TEMPLATES/BUILTIN_COVER_LETTER_TEMPLATES) exists, identified by
    (kind, name). Existing rows have their content refreshed on every startup --
    built-ins are never user-edited, so it's safe (and useful) to always keep them
    in sync with whatever the current code defines, rather than only seeding once.
    """
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        for kind, entries in (("cv", BUILTIN_CV_TEMPLATES), ("cover_letter", BUILTIN_COVER_LETTER_TEMPLATES)):
            for name, template_html in entries:
                row = (
                    db.query(models.Template)
                    .filter_by(kind=kind, name=name, is_custom=False)
                    .first()
                )
                if row:
                    row.template_html = template_html
                else:
                    db.add(
                        models.Template(
                            user_id=None,
                            kind=kind,
                            name=name,
                            is_custom=False,
                            template_html=template_html,
                        )
                    )
        db.commit()
    finally:
        db.close()


def run_migrations(engine: Engine) -> None:
    """Runs one-time, idempotent setup that create_all() alone doesn't cover, such as
    seeding fixed reference rows. There is no schema-migration logic here: this app
    treats local SQLite data as disposable across breaking schema changes (SQLite
    can't ALTER a column's type), so a breaking change means deleting app.db and
    letting Base.metadata.create_all() rebuild it from scratch.
    """
    seed_builtin_templates(engine)
