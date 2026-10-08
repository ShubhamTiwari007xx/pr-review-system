export type Component = {
  file: string;
}

 export type Relationship = {
    from: string;
    to: string;
 }

 export type RepositoryGraph = {
    components: Component[];
    relationships: Relationship[];
 }

 