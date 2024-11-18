import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from '@angular/fire/auth';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  serverTimestamp,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import firebase from 'firebase/compat/app';
import { switchMap, map } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore';

export interface User {
  uid: string;
  email: string;
}

export interface Message {
  createdAt: Timestamp;
  id: string;
  from: string;
  msg: string;
  fromName: string;
  myMsg: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  currentUser: User | null = null;

  constructor(private auth: Auth, private firestore: Firestore) {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.currentUser = { uid: user.uid, email: user.email || '' };
      } else {
        this.currentUser = null;
      }
    });
  }

  async signup({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<void> {
    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    const uid = credential.user.uid;

    await addDoc(collection(this.firestore, 'users'), {
      uid,
      email: credential.user.email,
    });
  }

  async signIn({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }

  // Funcionalidad del chat:

  async addChatMessage(msg: string): Promise<void> {
    if (!this.currentUser) return;
    await addDoc(collection(this.firestore, 'messages'), {
      msg,
      from: this.currentUser.uid,
      createdAt: serverTimestamp(),
    });
  }

  getChatMessages(): Observable<Message[]> {
    let users: User[] = [];
    const messagesRef = collection(this.firestore, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc')); // Añade estas importaciones

    return this.getUsers().pipe(
      switchMap((res) => {
        users = res;
        return collectionData(q, { idField: 'id' }) as Observable<Message[]>;
      }),
      map((messages) => {
        for (let m of messages) {
          m.fromName = this.getUserForMsg(m.from, users);
          m.myMsg = this.currentUser?.uid === m.from;
        }
        return messages;
      })
    );
  }

  private getUsers(): Observable<User[]> {
    return collectionData(collection(this.firestore, 'users'), {
      idField: 'uid',
    }) as Observable<User[]>;
  }

  private getUserForMsg(msgFromId: string, users: User[]): string {
    const user = users.find((usr) => usr.uid === msgFromId);
    return user ? user.email : 'Deleted';
  }
}
