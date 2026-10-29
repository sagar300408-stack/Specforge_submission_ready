import type { WorkflowRole, WorkflowState, WorkflowLogEntry, SectionComment } from "./types.js";

class WorkflowManager {
  private state: WorkflowState = "Draft";
  private logs: WorkflowLogEntry[] = [
    {
      id: "log-init",
      timestamp: new Date().toISOString(),
      user: "Author (Dr. S. Kumar)",
      role: "Author",
      action: "Initialized course specification draft",
      fromState: "Draft",
      toState: "Draft",
      comment: "Course spec initialized from departmental template and blueprint.",
    },
  ];
  private comments: SectionComment[] = [];

  getState(): WorkflowState {
    return this.state;
  }

  getLogs(): WorkflowLogEntry[] {
    return [...this.logs];
  }

  getComments(): SectionComment[] {
    return [...this.comments];
  }

  assertCanEditContent(role: WorkflowRole): void {
    if (role !== "Author") {
      throw new Error("HTTP 403: Only the Author is permitted to edit course specification content.");
    }
    if (this.state !== "Draft" && this.state !== "Returned") {
      throw new Error(`HTTP 403: Content editing is locked when workflow state is ${this.state}. Course must be in Draft or Returned.`);
    }
  }

  transition(
    toState: WorkflowState,
    role: WorkflowRole,
    user: string,
    comment: string = ""
  ): { success: boolean; state: WorkflowState; log: WorkflowLogEntry } {
    const fromState = this.state;

    // Validate valid transitions according to Level 5 rules:
    // Draft -> Submitted (Author)
    // Submitted -> Under Review (Reviewer)
    // Under Review -> Pending HOD (Reviewer)
    // Under Review -> Returned (Reviewer)
    // Pending HOD -> Approved (HOD)
    // Pending HOD -> Returned (HOD)
    // Returned -> Draft / Submitted (Author)

    if (toState === "Submitted") {
      if (role !== "Author") {
        throw new Error("HTTP 403: Only the Author can submit a course specification.");
      }
      if (fromState !== "Draft" && fromState !== "Returned") {
        throw new Error(`Invalid transition: Cannot submit from ${fromState}.`);
      }
    } else if (toState === "Under Review") {
      if (role !== "Reviewer") {
        throw new Error("HTTP 403: Only the Reviewer can mark a course as Under Review.");
      }
    } else if (toState === "Pending HOD") {
      if (role !== "Reviewer") {
        throw new Error("HTTP 403: Only the Reviewer can forward to HOD.");
      }
    } else if (toState === "Approved") {
      if (role !== "HOD") {
        throw new Error("HTTP 403: Only the HOD can grant final approval.");
      }
      if (fromState !== "Pending HOD") {
        throw new Error(`Invalid transition: Cannot approve directly from ${fromState}. Must be Pending HOD.`);
      }
    } else if (toState === "Returned") {
      if (role !== "Reviewer" && role !== "HOD") {
        throw new Error("HTTP 403: Only Reviewer or HOD can return a specification.");
      }
      if (!comment.trim()) {
        throw new Error("A comment explaining why the specification is returned is required.");
      }
    }

    this.state = toState;
    const log: WorkflowLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: user || `${role} User`,
      role,
      action: `Changed status from ${fromState} to ${toState}`,
      fromState,
      toState,
      comment: comment.trim() || `Workflow progressed to ${toState}`,
    };
    this.logs.unshift(log);

    return { success: true, state: this.state, log };
  }

  addComment(section: string, text: string, role: WorkflowRole, user: string): SectionComment {
    const newComment: SectionComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      section,
      text,
      role,
      user: user || `${role} User`,
      timestamp: new Date().toISOString(),
    };
    this.comments.unshift(newComment);
    return newComment;
  }
}

export const workflowStore = new WorkflowManager();
