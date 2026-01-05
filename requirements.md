# babysitter ide

## Overview

babysitter is vscode extension that is includes very tight integration with the o command and framework:

1. dispatching new runs (using o command)
2. monitoring runs (by inspecting the journal.jsonl file, state.json and files in the run directory)
3. viewing run results and artifacts (by inspecting the files in the run/artifacts directory)
4. resuming runs (by dispatching a run with just the run id and the request as the prompt)
5. pausing runs and resuming them with additional commands (esc and enter through stdin)
6. viewing task stdouts and work summaries.
7. providing a simple interface for the user to interact with the run.
8. ability to drag files (links) into new tasks (runs) before dispatching them.
9. interface should be adapted to be able to craft a prompt in an interface that is very tailored to the processes in .a5c/processes/ and should cover all the various processes types and their parameterizations, structured inputs, etc.
10. should allow the user to respond to breakpoints when the o command line utility stops and prompts the user for feedback, steering of the process, or other clarification.
11. easy to use interface that is optimized to the reasonable user flows. 
12. look at https://github.com/a5c-ai/o/blob/main/USER_GUIDE.md for some references and conceptual reasoning behind the o command line utility.

- needs to be developed in a test driven manner
- needs to look pretty, slick, useful and visually appealing and polished.
- needs to be easy to use and understand and use.
- well documented and commented code.
- assumes that the o command line utility is installed and available in the root path of the project OR at a global path (allow to configure through vscode settings)
