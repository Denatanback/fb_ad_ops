# Access

## MVP access model
- Authenticated users only.
- The MVP assumes a shared internal workspace for one team.
- Keep the MVP simple and oriented toward internal operational use, not external customer tenancy.

## Roles
- `admin`: can manage users and access the operational parts of the system.
- `member`: can use the operational parts of the system.

## Entity audit fields
- Include `created_by` and `updated_by` on core mutable entities from the beginning so the shared internal workspace has basic accountability.
- Apply this to operational records such as Approaches, Creatives, Landers, Launches, and other user-managed records added during implementation.
