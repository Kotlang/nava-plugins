export type ChatRequest = {
    chat_session_id: string,
    filePath: string,
    language: string,
    entireContent: string,
    selectedContent: string,
    query: string,
}

export type ChatResponse = {
    id: string;
    response: string;
}