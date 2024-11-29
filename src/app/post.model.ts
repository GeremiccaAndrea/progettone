export class Post {
    title: string;
    crime: string;
    content: string;
    created_at: Date;
    constructor(title: string, content: string, crime: string) {
        this.title = title;
        this.crime = crime;
        this.content = content;
        this.created_at = new Date();
    }
}