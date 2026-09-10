import {
  IResumeBuilderRepository,
  SaveDraftData,
  UpdateDraftData,
} from "../interfaces/IResumeBuilderRepository.js";
import { IAIProvider } from "../interfaces/IAIProvider.js";
import { IPDFGenerator } from "../interfaces/IPDFGenerator.js";

/**
 * SOLID — S (Single Responsibility): Handles only resume-builder draft business logic.
 * SOLID — D (Dependency Inversion): Receives IResumeBuilderRepository interface, not concrete class.
 *
 * OOP — Encapsulation: Validation & business rules are here, not in controllers.
 */
export class ResumeBuilderService {
  constructor(
    private repository: IResumeBuilderRepository,
    private aiProvider: IAIProvider,
    private pdfGenerator: IPDFGenerator,
  ) {}

  async generateResume(chatHistory: any[], currentData: any): Promise<any> {
    if (!this.aiProvider.buildResumeFromChat) {
      throw new Error("AI Provider does not support chat building.");
    }
    return this.aiProvider.buildResumeFromChat(chatHistory, currentData);
  }

  async exportPdf(data: any, theme: string): Promise<Buffer> {
    const fileName = `resume_${Date.now()}.pdf`;
    return this.pdfGenerator.generate(data, fileName); // Assuming generator handles theme implicitly or data structure is enough
  }

  async saveDraft(
    userId: string,
    title: string,
    data: Record<string, unknown>,
    theme: string,
  ): Promise<{ id: string }> {
    if (!userId) throw new Error("User ID is required.");
    if (!data) throw new Error("Resume data is required.");

    return this.repository.create({
      userId,
      title: title || "Untitled Resume",
      data,
      theme: theme || "default",
    });
  }

  async updateDraft(
    id: string,
    userId: string,
    updates: UpdateDraftData,
  ): Promise<{ id: string }> {
    if (!id) throw new Error("Draft ID is required.");
    const existing = await this.repository.findById(id, userId);
    if (!existing) throw new Error("Draft not found or access denied.");
    return this.repository.update(id, userId, updates);
  }

  async getDraft(id: string, userId: string): Promise<any> {
    const draft = await this.repository.findById(id, userId);
    if (!draft) throw new Error("Draft not found.");
    return draft;
  }

  async listDrafts(userId: string): Promise<any[]> {
    return this.repository.findByUserId(userId);
  }

  async deleteDraft(id: string, userId: string): Promise<void> {
    const existing = await this.repository.findById(id, userId);
    if (!existing) throw new Error("Draft not found or access denied.");
    await this.repository.delete(id, userId);
  }

  async enhanceBullet(bulletPoint: string, role: string): Promise<string> {
    if (!this.aiProvider.enhanceBullet) {
      throw new Error("AI Provider does not support bullet enhancement.");
    }
    return this.aiProvider.enhanceBullet(bulletPoint, role);
  }
}
