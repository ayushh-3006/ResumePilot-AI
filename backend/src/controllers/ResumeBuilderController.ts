import { Request, Response } from "express";
import { ResumeBuilderService } from "../services/ResumeBuilderService.js";
import { ResumeBuilderRepository } from "../repositories/ResumeBuilderRepository.js";
import { AIProvider } from "../providers/GroqAIProvider.js";
import { PuppeteerGenerator } from "../generators/PuppeteerGenerator.js";
import fs from "fs";

/**
 * SOLID — S (Single Responsibility): Handles HTTP for resume-builder drafts.
 */
export class ResumeBuilderController {
  private builderService: ResumeBuilderService;

  constructor() {
    this.builderService = new ResumeBuilderService(
      new ResumeBuilderRepository(),
      new AIProvider(),
      new PuppeteerGenerator(),
    );
  }

  generate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chatHistory, currentData } = req.body;
      if (!chatHistory) {
        res
          .status(400)
          .json({ success: false, error: "chatHistory is required" });
        return;
      }
      const userId = (req as any).auth?.userId || (req as any).userId;
      
      const newResume = await this.builderService.generateResume(
        chatHistory,
        currentData || {},
      );

      // Auto-save draft
      let savedDraftId = null;
      if (userId) {
        const title = newResume.personalInfo?.fullName
          ? `${newResume.personalInfo.fullName}'s Resume`
          : "My Resume";
          
        if (currentData?.id) {
          const result = await this.builderService.updateDraft(currentData.id, userId, {
            title,
            theme: currentData.theme || "default",
            data: newResume,
          });
          savedDraftId = result.id;
        } else {
          const result = await this.builderService.saveDraft(
            userId,
            title,
            newResume,
            "default",
          );
          savedDraftId = result.id;
        }
      }

      res.status(200).json({ 
        success: true, 
        data: { ...newResume, id: savedDraftId } 
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  export = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resumeData, theme } = req.body;
      if (!resumeData) {
        res
          .status(400)
          .json({ success: false, error: "resumeData is required" });
        return;
      }

      const pdfBuffer = await this.builderService.exportPdf(
        resumeData,
        theme || "default",
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="resume_${Date.now()}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  saveDraft = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).auth?.userId || (req as any).userId;
      const { id: draftId, title, theme, ...data } = req.body;

      if (draftId && draftId !== "1") {
        const result = await this.builderService.updateDraft(draftId, userId, {
          title,
          theme,
          data: req.body,
        });
        res
          .status(200)
          .json({ success: true, message: "Draft updated", id: result.id });
      } else {
        const result = await this.builderService.saveDraft(
          userId,
          title,
          req.body,
          theme,
        );
        res
          .status(201)
          .json({ success: true, message: "Draft saved", id: result.id });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  getDrafts = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).auth?.userId || (req as any).userId;
      const drafts = await this.builderService.listDrafts(userId);
      res.status(200).json({ success: true, data: drafts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  getDraftById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).auth?.userId || (req as any).userId;
      const { id } = req.params;
      const draft = await this.builderService.getDraft(id as string, userId);
      res.status(200).json({ success: true, data: draft });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  };

  deleteDraft = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).auth?.userId || (req as any).userId;
      const { id } = req.params;
      await this.builderService.deleteDraft(id as string, userId);
      res.status(200).json({ success: true, message: "Draft deleted" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  enhanceBullet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { bulletPoint, role } = req.body;
      if (!bulletPoint || !role) {
        res
          .status(400)
          .json({ success: false, error: "bulletPoint and role are required" });
        return;
      }

      const enhancedBullet = await this.builderService.enhanceBullet(
        bulletPoint,
        role,
      );
      res.status(200).json({ success: true, data: enhancedBullet });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}
