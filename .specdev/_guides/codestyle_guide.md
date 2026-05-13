## Coding Philosophy

**Independent Modules**
- Each module stands alone and does one domain well
- No hidden cross-module dependencies; only use explicit imports.
- Benefit: Users can pick and choose without tight coupling.

**Pure by Default (No Side Effects)**
- Functions are pure: same inputs → same outputs, no hidden state changes unless its for classes 
- Functions should not modify inputs 
- Allowed exception: clearly named setup/config functions (e.g., setup_logging) that establish global state.
- Benefit: Predictable, testable, and safe for parallel use.

**Single-Responsibility Functions**
- Each function does one thing clearly.
- Simple signatures, clear names; avoid giant config dicts unless the flexibility is the goal.
- Benefit: Easier to read, test, and maintain.

**Be Explicit**

- Behavior and return types are consistent and predictable.
- Include example output in the comment
- Required params are positional; optional params are keyword with defaults.
- Benefit: No surprises; intent is clear from the signature.

**Documentation**

- Public functions have docstrings (purpose, params, returns).
- Complex logic has inline comments.
- Major modules have example notebooks showing usage, only when user request it

**Code Organization**
- No circular imports.