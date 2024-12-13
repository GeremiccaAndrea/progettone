import { Post } from "./post.model";

export class Profile {
    uid: string;
    name: string;
    avatar: string;
    description: string; 
    posts: Post[];
    constructor(name: string) {
        this.name = name;
    }
}

