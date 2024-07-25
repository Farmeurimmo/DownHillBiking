# DownHillBiking

Projet réalisé dans le cadre du concours des Olympiades de l'ingénieur 2024 dans
l'académie de Grenoble.
Le thème était "L'INGÉNIERIE AU SERVICE DU SPORT".

Le projet a reçu le prix de la réalisation de la part de NTN Annecy.

## Description

Le projet consiste en la réalisation d'une machine de sport de descente de
vélo. Le but est de simuler une descente de vélo en montagne.

## Comment fonctionne le site ?

Il faut connecter la carte arduino en bluetooth en utilisant google
chrome comme navigateur.

Le code de la carte arduino est ci-dessous :

```cpp
#include <SoftwareSerial.h>
#include "MMA7660.h"

MMA7660 accelemeter;
const int RX = 2;
const int TX = 3;

SoftwareSerial xbeeSerial(RX, TX);

void setup() {
    accelemeter.init(); 
     
    pinMode(RX, INPUT);
    pinMode(TX, OUTPUT);
    xbeeSerial.begin(9600);
    Serial.begin(9600);
}

void loop() {
    int8_t x;
    int8_t y;
    int8_t z;
    accelemeter.getXYZ(&x,&y,&z); # Utilisation des pointeurs
    xbeeSerial.print(x);
    xbeeSerial.print("|");
    xbeeSerial.print(y);
    xbeeSerial.print("|");
    xbeeSerial.println(z);

    Serial.print(x);
    Serial.print("|");
    Serial.print(y);
    Serial.print("|");
    Serial.println(z);
    delay(50);
}
```