---
title: High Noon
order: 2
year: 2023
status: shipped
studio: Studio-23
employmentType: employee
platforms: [Windows]
teamSize: 2
duration: 4 months
role: Gameplay Programmer & UI/UX Owner (PC)
tagline: A real-time PvP dueling game powered by Photon networking.
thumb: /images/thumbs/high-noon.png
genres: [pvp, duel]
tech: [Unity, "C#", Photon, Blender]
links:
  itch: https://brainstation23.itch.io/high-noon
keyInsights: []
gallery: []
snippets:
  - title: "Authoritative duel-state replication"
    language: csharp
    caption: "Replace this with a real extract from your Photon networking layer."
    code: |
      using Photon.Pun;
      using UnityEngine;

      public class DuelStateSync : MonoBehaviourPun, IPunObservable
      {
          public DuelPhase Phase { get; private set; } = DuelPhase.Standoff;
          public float CountdownRemaining { get; private set; }

          public void OnPhotonSerializeView(PhotonStream stream, PhotonMessageInfo info)
          {
              if (stream.IsWriting)
              {
                  stream.SendNext((byte)Phase);
                  stream.SendNext(CountdownRemaining);
              }
              else
              {
                  Phase = (DuelPhase)(byte)stream.ReceiveNext();
                  CountdownRemaining = (float)stream.ReceiveNext();
              }
          }
      }
---

## Role & Responsibilities

Built a real-time player-versus-player dueling game using Photon Unity
Networking and developed all systems from scratch. Explored design ideas
to make the game more fun and engaging with the support of 3D artists
and designers from the team. Design owner of the UI & UX on the PC platform.

## Learnings

[ FILL ME IN ]

## Behind the Scenes

[ FILL ME IN ]
