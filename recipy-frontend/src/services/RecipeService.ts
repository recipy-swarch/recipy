import { IRecipe } from "@/interfaces/IRecipe";
import { IComments } from "@/interfaces/IComments";
import { ILike } from "@/interfaces/ILike";

/**
 * Servicio único para todas las operaciones GraphQL de recetas.
 * Se utiliza siempre `${this.apiUrl}/recipe/graphql` como endpoint.
 */
class RecipeService {
  // URL base del WAF (gateway)
  private apiUrl: string;
  // Endpoint GraphQL completo
  private graphqlEndpoint: string;

  constructor() {
    this.apiUrl = process.env.WAF_URL || "";
    console.log("API (cliente) apuntando a:", this.apiUrl);
    if (!this.apiUrl) {
      throw new Error("WAF_URL no está definido");
    }

    // Si estamos en el navegador usamos ruta relativa (proxy de Next.js),
    // si estamos en Node (SSR/actions) usamos la URL completa:
    const inBrowser = typeof window !== "undefined";
    this.graphqlEndpoint =
      (inBrowser ? "" : this.apiUrl) + "/recipe/graphql";
  }
  // 1) Obtener todas las recetas
  fetchAllRecipes = async (): Promise<IRecipe[]> => {
    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query {
            recipes {
              id
              title
              description
              prepTime
              portions
              steps
              images
              video
              userId
            }
          }
        `,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error fetching recipes:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.recipes as IRecipe[];
  };

  // 2) Obtener receta por ID
  fetchRecipe = async (recipeId: string): Promise<IRecipe> => {
    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query ($id: ID!) {
            recipe(id: $id) {
              id
              title
              description
              prepTime
              portions
              steps
              images
              video
              userId
            }
          }
        `,
        variables: { id: recipeId },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error fetching recipe:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.recipe as IRecipe;
  };

  // 3) Obtener comentarios de una receta
  fetchComments = async (recipeId: string): Promise<IComments[]> => {
    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query ($rid: ID!) {
            commentsByRecipe(recipeId: $rid) {
              id
              recipeId
              userId
              content
              parentId
              createdAt
            }
          }
        `,
        variables: { rid: recipeId },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error fetching comments:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.commentsByRecipe as IComments[];
  };

  // 4) Crear un nuevo comentario
  createComment = async (
    recipeId: string,
    content: string,
    parentId?: string,
    token?: string
  ): Promise<IComments> => {
    const mutation = `
      mutation ($input: CommentInput!) {
        addComment(input: $input) {
          id
          recipeId
          userId
          content
          parentId
          createdAt
        }
      }
    `;

    const input: any = { recipeId, content };
    if (parentId) input.parentId = parentId;

    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ query: mutation, variables: { input } }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error creating comment:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.addComment as IComments;
  };

  // 5) Obtener recetas de un usuario
  fetchUserRecipes = async (userId: string): Promise<IRecipe[]> => {
    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query ($uid: ID!) {
            recipesByUser(userId: $uid) {
              id
              title
              description
              prepTime
              portions
              steps
              images
              video
              userId
            }
          }
        `,
        variables: { uid: userId },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error fetching user recipes:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.recipesByUser as IRecipe[];
  };

  // 6) Crear receta
  createRecipe = async (
    formData: FormData,
    token: string
  ): Promise<IRecipe> => {
    const input = {
      title: formData.get("title"),
      prepTime: formData.get("prep_time"),
      portions: Number(formData.get("portions")),
      description: formData.get("description"),
      steps: JSON.parse(formData.get("steps") as string),
      images: [],
      video: null,
    };

    const mutation = `
      mutation ($recipe: RecipeInput!) {
        addRecipe(recipe: $recipe) {
          id
          title
          description
          prepTime
          portions
          steps
          images
          video
          userId
        }
      }
    `;

    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: mutation, variables: { recipe: input } }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error creating recipe:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.addRecipe as IRecipe;
  };

  // 7) Dar like a una receta
  likeRecipe = async (
    recipeId: string,
    token?: string
  ): Promise<ILike> => {
    const mutation = `
      mutation ($rid: ID!) {
        likeRecipe(recipeId: $rid) {
          userId
          recipeId
          createdAt
        }
      }
    `;

    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ query: mutation, variables: { rid: recipeId } }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error liking recipe:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.likeRecipe as ILike;
  };

  // 8) Quitar like de una receta
  unlikeRecipe = async (
    recipeId: string,
    token?: string
  ): Promise<boolean> => {
    const mutation = `
      mutation ($rid: ID!) {
        unlikeRecipe(recipeId: $rid)
      }
    `;

    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ query: mutation, variables: { rid: recipeId } }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error unliking recipe:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.unlikeRecipe as boolean;
  };

  // 9) Contar likes de una receta
  getLikesCount = async (recipeId: string): Promise<number> => {
    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query ($rid: ID!) {
            likesCount(recipeId: $rid)
          }
        `,
        variables: { rid: recipeId },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error fetching likes count:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.likesCount as number;
  };

  // 10) Saber si el usuario ya dio like
  hasLiked = async (
    recipeId: string,
    token?: string
  ): Promise<boolean> => {
    const res = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        query: `
          query ($rid: ID!) {
            hasLiked(recipeId: $rid)
          }
        `,
        variables: { rid: recipeId },
      }),
    });

    // Si el backend responde 404, asumimos que no ha dado like
    if (res.status === 404) {
      return false;
    }
    if (!res.ok) {
      const txt = await res.text();
      console.error("Error fetching hasLiked:", txt);
      throw new Error(txt);
    }

    const { data, errors } = await res.json();
    if (errors?.length) {
      console.error("GraphQL errors:", errors);
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data.hasLiked as boolean;
  };
}

// Exportamos una instancia singleton del servicio
const recipeService = new RecipeService();
export default recipeService;
