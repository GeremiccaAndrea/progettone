import { Component, OnInit } from '@angular/core';
import { Auth, authInstance$, User  } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Post } from '../post.model';
import { FirebaseService } from '../firebase.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit {
  utente !: User | null;
  // Array dei post
  // Sarà popolato con i dati del database
  posts: Post[] = [
    {
      _id: '6734ad1bdaffd020d3bf57d3',
      data_inserimento: new Date(1731509035747),
      idUtente: '1',
      dove: 'Via Roma, Milano',
      rating: 5,
      tipo_di_crimine: 'Furto',
      geometry: {
        type: 'Point',
        coordinates: [9.19, 45.4642]
      }
    },
    {
      _id: '6734ad1bdaffd020d3bf57d3',
      data_inserimento: new Date(1731509035747),
      idUtente: '1',
      dove: 'Via Roma, Milano',
      rating: 5,
      tipo_di_crimine: 'Furto',
      geometry: {
        type: 'Point',
        coordinates: [9.19, 45.4642]
      }
    }
  ,
  {
    _id: '6734ad1bdaffd020d3bf57d4',
    data_inserimento: new Date(1731509035748),
    idUtente: '2',
    dove: 'Via Torino, Milano',
    rating: 4,
    tipo_di_crimine: 'Scippo',
    geometry: {
      type: 'Point',
      coordinates: [9.18, 45.4643]
    }
  },
  {
    _id: '6734ad1bdaffd020d3bf57d5',
    data_inserimento: new Date(1731509035749),
    idUtente: '3',
    dove: 'Corso Buenos Aires, Milano',
    rating: 3,
    tipo_di_crimine: 'Rapina',
    geometry: {
      type: 'Point',
      coordinates: [9.21, 45.4644]
    }
  },
  {
    _id: '6734ad1bdaffd020d3bf57d6',
    data_inserimento: new Date(1731509035750),
    idUtente: '4',
    dove: 'Piazza Duomo, Milano',
    rating: 5,
    tipo_di_crimine: 'Furto con scasso',
    geometry: {
      type: 'Point',
      coordinates: [9.19, 45.4645]
    }
  },
  {
    _id: '6734ad1bdaffd020d3bf57d7',
    data_inserimento: new Date(1731509035751),
    idUtente: '5',
    dove: 'Via Montenapoleone, Milano',
    rating: 2,
    tipo_di_crimine: 'Truffa',
    geometry: {
      type: 'Point',
      coordinates: [9.20, 45.4646]
    }
  },
  {
    _id: '6734ad1bdaffd020d3bf57d8',
    data_inserimento: new Date(1731509035752),
    idUtente: '6',
    dove: 'Via della Spiga, Milano',
    rating: 4,
    tipo_di_crimine: 'Scippo',
    geometry: {
      type: 'Point',
      coordinates: [9.21, 45.4647]
    }
  },
  {
    _id: '6734ad1bdaffd020d3bf57d9',
    data_inserimento: new Date(1731509035753),
    idUtente: '7',
    dove: 'Corso Venezia, Milano',
    rating: 3,
    tipo_di_crimine: 'Rapina',
    geometry: {
      type: 'Point',
      coordinates: [9.22, 45.4648]
    }
  }
  ];

  constructor(private firebase: FirebaseService, public auth: Auth, private router: Router, private route: ActivatedRoute) { 
    // Controllo se il profilo visualizza è quello dell'utente loggato
    /*
    if (this.auth.currentUser.uid == this.profilo.uid) {
      this.router.navigate([`/account`]);}
    */
   }

   ngOnInit(): void { 
    this.utente = this.auth.currentUser;
    console.log(this.utente);
    console.log(this.auth.currentUser);
   }


}