import { wait } from "../../utils/wait";

const gptIconSrc = chrome.runtime.getURL("icons/button.svg");
const gptIconErrorSrc = chrome.runtime.getURL("icons/button_error.svg");
const tweetTypes: Array<{ emoji: string; type: string; }> = [
    {emoji: '👍', type: 'supportive'}, 
    {emoji: '🎩', type: 'snarky'}, 
    {emoji: '🌤️', type: 'optimistic'},
    {emoji: '🔥', type: 'controversial'}, 
    {emoji: '🤩', type: 'excited'},
    {emoji: '🧠', type: 'smart'},
    {emoji: '🤠', type: 'hillbilly'},
    {emoji: '🏴‍☠️', type: 'pirate'},
    {emoji: '🤣', type: 'humorous'},
    {emoji: '🙄', type: 'passive aggressive'}
];

export const addGPTButton = async (toolbarEl: Element, onClick: (type: string, topic?: string) => Promise<void>) => {
    const state = await chrome.storage.local.get('isRandomType');
    const isRandomType = state.isRandomType ?? false;

    if (isRandomType) {
        addGPTButtonRandom(toolbarEl, onClick);
    } else {
        addGPTButtonWithType(toolbarEl, onClick);
    }
}

const maybeReturnTopic = async (): Promise<string | undefined> => {
    const replyState = await chrome.storage.local.get('isAddTopicForReplies');
    const isAddTopicForReplies = replyState.isAddTopicForReplies ?? false;

    const lastState = await chrome.storage.local.get('lastTopic');
    const lastTopic = lastState.lastTopic ?? '';

    const replyToTweet = document.querySelector("article[data-testid=\"tweet\"][tabindex=\"-1\"]");

    let topic: string | undefined;

    if (!replyToTweet || isAddTopicForReplies) {
        topic = window.prompt("What do you want to tweet about?", lastTopic) || 'Twitter';
        await chrome.storage.local.set({'lastTopic': topic});
    }

    return topic;
}

const addGPTButtonRandom = (toolbarEl: Element, onClick: (type: string, topic?: string) => Promise<void>) => {
    const buttonContainer = toolbarEl.children[0]; // doesn't have it's own readable class / testId
    // create icon component
    const gptIcon = document.createElement('img');
    gptIcon.classList.add("gptIcon");
    gptIcon.setAttribute("src", gptIconSrc);

    // create icon wrapper
    const gptIconWrapper = document.createElement('div');
    gptIconWrapper.classList.add("gptIconWrapper");
    gptIconWrapper.appendChild(gptIcon);
    gptIconWrapper.onclick = async () => {
        gptIconWrapper.classList.add("loading");
        const typeObj = tweetTypes[Math.floor(Math.random() * tweetTypes.length)];
        const topic = await maybeReturnTopic();
        await onClick(typeObj.type, topic);
        gptIconWrapper.classList.remove("loading");
    }

    // attach to container
    buttonContainer.appendChild(gptIconWrapper);
}

const addGPTButtonWithType = (toolbarEl: Element, onClick: (type: string, topic?: string) => Promise<void>) => {
    const doc = new DOMParser().parseFromString(`
        <div class="gptIconWrapper" id="gptButton">
            <img class="gptIcon" src="${gptIconSrc}" />
        </div>
    `, "text/html");
    const iconWrap = doc.querySelector("div[id=\"gptButton\"]")! as HTMLDivElement;

    const buttonContainer = toolbarEl.children[0];
    
    // attach to container
    buttonContainer.appendChild(iconWrap);

    iconWrap.onclick = async () => {
        const topic = await maybeReturnTopic();
        const bodyRect = document.body.getBoundingClientRect();
        const elemRect = iconWrap.getBoundingClientRect();

        const top   = elemRect.top - bodyRect.top;
        const left = elemRect.left - bodyRect.left + 40;
        let optionsList: HTMLDivElement;
        let dismissHandler: GlobalEventHandlers["onclick"];
        optionsList = createOptionsList(async (type: string) => {
            if (dismissHandler) {
                document.body.removeEventListener('click', dismissHandler);
            }
            if (optionsList) {
                optionsList.remove();
            }

            iconWrap.classList.add("loading");
            await onClick(type, topic);
            iconWrap.classList.remove("loading");
        });

        optionsList.style.left = `${left}px`;
        optionsList.style.top = `${top}px`;

        document.body.appendChild(optionsList);
        dismissHandler = () => {
            if (dismissHandler) {
                document.body.removeEventListener('click', dismissHandler);
            }
            if (optionsList) {
                optionsList.remove();
            }
        };

        window.setTimeout(() => {
            document.body.addEventListener('click', dismissHandler!);
        }, 1);
    }
}

const createOptionsList = (onClick: (type: string) => Promise<void>) => {
    const container = document.createElement("div");
    container.classList.add("gptSelectorContainer");

    for(const tt of tweetTypes) {
        const item = document.createElement("div");
        item.classList.add("gptSelector");
        item.innerHTML = `${tt.emoji}&nbsp;&nbsp;${tt.type}`;
        item.onclick = (e) => {
            e.stopPropagation();
            onClick(tt.type);
        };
        container.appendChild(item);
    }

    return container;
}

export const showErrorButton = async (toolbarEl: Element) => {
    const gptIcon = toolbarEl.querySelector(".gptIcon");
    if (gptIcon) {
        gptIcon.setAttribute("src", gptIconErrorSrc);
        gptIcon.classList.add("error");
    }
    await wait(5000);
    gptIcon?.setAttribute("src", gptIconSrc);
    gptIcon?.classList.remove("error");
}