export const START_NODE = '__start__';
export const END_NODE = '__end__';
export class RipplegraphError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'RipplegraphError';
    }
}
