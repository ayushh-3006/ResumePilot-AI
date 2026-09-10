import { v4 as uuidv4 } from "uuid";
import { IAIProvider } from "../interfaces/IAIProvider.js";
import { IResumeParser } from "../interfaces/IResumeParser.js";
import { IPDFGenerator } from "../interfaces/IPDFGenerator.js";
import { IResumeRepository } from "../interfaces/IResumeRepository.js";
import RoleEnhancerFactory from "../enhancer/RoleEnhancerFactory.js";

/**
 * SOLID — S (Single Responsibility): Only responsible for orchestrating the
 *                                    resume enhancement flow. No HTTP. No DB. Just steps.
 *
 * SOLID — D (Dependency Inversion): All 4 dependencies are interfaces.
 *   - Swap Groq for OpenAI? Change one line in ResumeController.
 *   - Swap PDF parser for DOCX? Change one line in ResumeController.
 *   - This service NEVER changes for those swaps.
 *
 * OOP — Encapsulation: The entire enhancement pipeline is hidden behind
 *                      simple public methods. Controller only calls .enhance().
 */
export class ResumeService {
  constructor(
    private parser: IResumeParser, // Knows HOW to extract text from PDF
    private aiProvider: IAIProvider, // Knows HOW to call AI
    private pdfGenerator: IPDFGenerator, // Knows HOW to create a PDF
    private repository: IResumeRepository, // Knows HOW to save to DB
  ) {}

  /**
   * Main enhancement flow:
   * Upload PDF → Extract text → AI enhance → Generate PDF → Save to DB → Return result
   */
  async enhance(
    fileBuffer: Buffer,
    jobDescription: string,
    role: string,
    userId: string,
  ): Promise<{ id: string; pdfUrl: string; enhancedText: string }> {
    const originalText = await this.parser.parse(fileBuffer);

    const roleEnhancer = RoleEnhancerFactory.create(role, this.aiProvider);

    // AI now returns a structured object
    const enhancedData = await roleEnhancer.enhance(
      originalText,
      jobDescription,
    );

    // Generate the PDF buffer (we no longer save to ephemeral disk)
    const pdfBuffer = await this.pdfGenerator.generate(enhancedData);
    
    // Provide a dummy URL or if cloud storage was used, the real URL.
    // We avoid ephemeral local storage for Render compatibility.
    const pdfUrl = `/api/uploads/unavailable`;

    const saved = await this.repository.save({
      userId,
      originalText,
      enhancedText: JSON.stringify(enhancedData), // Store as string for now
      jobDescription,
      pdfUrl,
    });

    return { id: saved.id, pdfUrl, enhancedText: JSON.stringify(enhancedData) };
  }

  async getMyResumes(userId: string): Promise<any[]> {
    return this.repository.findByUserId(userId);
  }

  async getResumeById(id: string): Promise<any> {
    const resume = await this.repository.findById(id);

    if (!resume) {
      throw new Error("Resume not found.");
    }

    return resume;
  }

  getAvailableRoles(): string[] {
    return RoleEnhancerFactory.getAvailableRoles();
  }
}
