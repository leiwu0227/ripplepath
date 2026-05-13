
# Scaffolding Template

For any file that needs to be implemented, the written scaffolding file MUST be exactly of the following format

==================== SCAFFOLDING FORMAT ================

*Description*
A short high level description of what the file does.

*Dependencies*
List all external files and functions/classes that this file depends on.
Format: filename.py: function_name(), ClassName
If no dependencies, write "None"

*Workflows*
Simple work flows if any. Show the end-to-end flow with arrows.

*Examples*
Show usage examples with inputs and outputs. Include both success cases and failure/error cases. 


*Pseudocode*

Below is an example pseudocode for python class file.

- It should contain the class name, interface name etc
- It should contain the function names and signatures with type hints
- Each function should contain a short description of its purpose
- Pseudocode should be written as descriptive sentences explaining WHAT to do, not HOW to implement it
- Do NOT write code syntax in pseudocode - use plain sentences instead 

```python

class ClassName if any:

    def functionname(input parameters) -> return_type:
        # Short description of the function purpose
        # Input: parameter descriptions with types
        # Output: return value description with type
        # Raises: exceptions that can be raised

        # Pseudo code:
        # 1. [Descriptive sentence of what step 1 does]
        # 2. [Descriptive sentence of what step 2 does]
        # 3. [Descriptive sentence of what step 3 does]
        # ... continue for all steps


def standalone_function(input parameters) -> return_type:
    # Short description of the function purpose
    # Input: parameter descriptions with types
    # Output: return value description with type
    # Raises: exceptions that can be raised

    # Pseudo code:
    # 1. [Descriptive sentence of what step 1 does]
    # 2. [Descriptive sentence of what step 2 does]
    # ... continue for all steps

```