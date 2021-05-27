# Contributing to LFPH-Medcreds

## General Guidelines
_Nobody_ commits directly unless forced to fix a mistake within 10 minutes

All changes are through pull request (PR) on a branch created by the contributor. Name the branch something relevant, e.g., refactor-routes

Commits must include DCO signoffs by doing a git commit -s ... which puts your email at the end of the message.

Must be signed off by at least 2 other contributors

Must pass CI and all tests 

Must be open for at least 48 hours

Add the following license information to each source file:

`# SPDX-License-Identifier: Apache-2.0`



## How do I make a contribution?
Never made an open source contribution before? Wondering how contributions work in the in our project? Here's a quick rundown!

1. Find an issue that you are interested in addressing or a feature that you would like to add.

2. Fork the medcreds-api repository associated with the issue to your local GitHub organization. This means that you will have a copy of the repository under your-GitHub-username/medcreds-api.

3. Clone the repository to your local machine using git clone https://github.com/github-username/medcreds-api.git.

4. Create a new branch for your fix using git checkout -b branch-name-here.

5. Make the appropriate changes for the issue you are trying to address or the feature that you want to add.

6. Use git add insert-paths-of-changed-files-here to add the file contents of the changed files to the "snapshot" git uses to manage the state of the project, also known as the index.

7. Use git commit -m -s "Insert a short message of the changes made here" to store the contents of the index with a descriptive message. -s flag adds Developer Certificate of Origin (DCO)
8. Push the changes to the remote repository using git push origin branch-name-here.

9. Submit a pull request to the upstream repository.

10. Title the pull request with a short description of the changes made and the issue or bug number associated with your change. For example, you can title an issue like so "Added more log outputting to resolve #4352".

11. In the description of the pull request, explain the changes that you made, any issues you think exist with the pull request you made, and any questions you have for the maintainer. It's OK if your pull request is not perfect (no pull request is), the reviewer will be able to help you fix any problems and improve it!

12. Wait for the pull request to be reviewed by at least 2 other contributors

13. Make changes to the pull request if the reviewing contributor recommends them.

14. Celebrate your success after your pull request is merged!