# Contributions

Every member has to complete at least 2 meaningful tasks per week, where a
single development task should have a granularity of 0.5-1 day. The completed
tasks have to be shown in the weekly TA meetings. You have one "Joker" to miss
one weekly TA meeting and another "Joker" to once skip continuous progress over
the remaining weeks of the course. Please note that you cannot make up for
"missed" continuous progress, but you can "work ahead" by completing twice the
amount of work in one week to skip progress on a subsequent week without using
your "Joker". Please communicate your planning **ahead of time**.

Note: If a team member fails to show continuous progress after using their
Joker, they will individually fail the overall course (unless there is a valid
reason).

**You MUST**:

* Have two meaningful contributions per week.

**You CAN**:

* Have more than one commit per contribution.
* Have more than two contributions per week.
* Link issues to contributions descriptions for better traceability.

**You CANNOT**:

* Link the same commit more than once.
* Use a commit authored by another GitHub user.

***

## Contributions Week 1 - 23.03.2026 to 01.04.2026

| **Student**         | **Date**   | **Link to Commit**                                                                                                  | **Description**                                                                                                                                                                                                                                                                                                                                                                                      | **Relevance**                                                                                                                                               |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **eldarrr21**       | 28.03.2026 | eb5a48125f48ac4e11211fd811a190368040b6e9                                                                            | upsateUser method with owner-only access, username uniqueness validation, and password change with currentpassword auth, PUT mapping in controller, changed avatarURL column to TEXT, add currentpasword transient field to userentity and currentpassword field to postdto and DTOmapper                                                                                                            | secure changing user credential especially password                                                                                                         |
|                     | 28.03.2026 | ae1efe18a66c16d7641c63835539b3b86aa8b1a0 -13826abbc81ff3dc85deba0273e4f43c5f26dbab                                  | redesign page.tsx with owner edit view and read-only view for other users, owner view: editable username, name, bio, avatat upload and collapsible password change with validation, other user: read-only view, redirect to dashboard on successful save, add token to apiservice for auth updates, store response.id via localstorage in login\&register/page.tsx for profile owner identificiation | needed for ingame experience to see others as well as change own profile if needed                                                                          |
| **@jmetzger8**      | 27.03.26   | <https://github.com/MaximEichenberger04/sopra-fs26-group-27-client/commit/c1faf2fc1181d3eb9a431b2b1491106fe1b17d7e> | Adds token-based auth to API calls, extends the User type with new profile fields, replaces the placeholder profile page with a working one, updates the dashboard table columns, and fixes a localStorage init race condition that caused false login redirects.                                                                                                                                    | Closes the gap between a static prototype and a functional authenticated app where users can browse profiles and manage sessions reliably.                  |
|                     | 27.03.26   | <https://github.com/MaximEichenberger04/sopra-fs26-group-27-server/commit/9b897e90f7faa4ef43d95cea072ba22347dd91cb> | Adds a GET endpoint for fetching a user by ID with token validation, introduces a findByToken repository method, and fixes the password comparison bug (replacing != with .equals())                                                                                                                                                                                                                 | Provides the backend counterpart to the profile and dashboard pages built in the previous contribution, which contained the bulk of the work for this week. |
| **\[@githubUser3]** | \[date]    | \[Link to Commit 1]                                                                                                 | \[Brief description of the task]                                                                                                                                                                                                                                                                                                                                                                     | \[Why this contribution is relevant]                                                                                                                        |
|                     | \[date]    | \[Link to Commit 2]                                                                                                 | \[Brief description of the task]                                                                                                                                                                                                                                                                                                                                                                     | \[Why this contribution is relevant]                                                                                                                        |
| **\[@githubUser4]** | \[date]    | \[Link to Commit 1]                                                                                                 | \[Brief description of the task]                                                                                                                                                                                                                                                                                                                                                                     | \[Why this contribution is relevant]                                                                                                                        |
|                     | \[date]    | \[Link to Commit 2]                                                                                                 | \[Brief description of the task]                                                                                                                                                                                                                                                                                                                                                                     | \[Why this contribution is relevant]                                                                                                                        |

***

## Contributions Week 2 - \[Begin Date] to \[End Date]

| **Student**         | **Date** | **Link to Commit**  | **Description**                  | **Relevance**                        |
| ------------------- | -------- | ------------------- | -------------------------------- | ------------------------------------ |
| **\[@githubUser1]** | \[date]  | \[Link to Commit 1] | \[Brief description of the task] | \[Why this contribution is relevant] |
|                     | \[date]  | \[Link to Commit 2] | \[Brief description of the task] | \[Why this contribution is relevant] |
| **\[@githubUser2]** | \[date]  | \[Link to Commit 1] | \[Brief description of the task] | \[Why this contribution is relevant] |
|                     | \[date]  | \[Link to Commit 2] | \[Brief description of the task] | \[Why this contribution is relevant] |
| **\[@githubUser3]** | \[date]  | \[Link to Commit 1] | \[Brief description of the task] | \[Why this contribution is relevant] |
|                     | \[date]  | \[Link to Commit 2] | \[Brief description of the task] | \[Why this contribution is relevant] |
| **\[@githubUser4]** | \[date]  | \[Link to Commit 1] | \[Brief description of the task] | \[Why this contribution is relevant] |
|                     | \[date]  | \[Link to Commit 2] | \[Brief description of the task] | \[Why this contribution is relevant] |

***

## Contributions Week 3 - \[Begin Date] to \[End Date]

_Continue with the same table format as above._

***

## Contributions Week 4 - \[Begin Date] to \[End Date]

_Continue with the same table format as above._

***

## Contributions Week 5 - \[Begin Date] to \[End Date]

_Continue with the same table format as above._

***

## Contributions Week 6 - \[Begin Date] to \[End Date]

_Continue with the same table format as above._
