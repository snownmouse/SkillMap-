import { v4 as uuidv4 } from 'uuid';
import { ChatMessageRepository } from '../repositories';

export class ChatMessageService {
  constructor(private messageRepo: ChatMessageRepository) {}

  saveChatMessages(treeId: string, nodeId: string, userMessage: string, aiResult: any) {
    const userMsgId = uuidv4();
    const aiMsgId = uuidv4();

    this.messageRepo.saveMessages([
      {
        id: userMsgId,
        treeId,
        nodeId,
        role: 'user',
        content: userMessage,
        metadata: null
      },
      {
        id: aiMsgId,
        treeId,
        nodeId,
        role: 'assistant',
        content: aiResult.reply,
        metadata: JSON.stringify(aiResult)
      }
    ]);
  }
}