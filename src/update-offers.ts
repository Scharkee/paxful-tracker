import * as api from "./api";
import { config } from "./config";

// process offer margin list received from Paxful
export async function updateOffer(offerValues: any, offerDescription: any, denomination:string="all"): Promise<number> {
  
  // no margin range == offer control disabled
  if(!offerDescription.adjustedMarginMin && !offerDescription.adjustedMarginsMin[denomination])
    return;

  let marginMin: number, marginMax: number;
  marginMin = denomination == "any" ? offerDescription.adjustedMarginMin : offerDescription.adjustedMarginsMin[denomination];
  marginMax = denomination == "any" ? offerDescription.adjustedMarginMax : offerDescription.adjustedMarginsMax[denomination];

  /////////////////////////
  // SPĖJIMAS: kai kurių sąrašų automatiškai nesurikiuoja - rikiuojam rankiniu būdu
  /////////////////////////
  var sortedOfferValues = offerValues.sort((n1, n2) => n1 - n2);

  // edit offer if paymentMethod and denomination match 
  var result = await api.rates.self();
  var myOffers = result.data.offers;

  for(const element of myOffers) {
      
    if(offerDescription.paymentMethod != element.payment_method_slug)
      return;

    if(denomination != "all") {
      var denom_number = parseFloat(denomination);
      var fiat_min = parseFloat(element.fiat_amount_range_min);
      var fiat_max = parseFloat(element.fiat_amount_range_max);

      //////////////////////////
      // SPĖJIMAS: fiat_min turi būti intervale [fiat_amount_range_min; fiat_amount_rangemax] 
      //////////////////////////
      if(denom_number > fiat_max || denom_number < fiat_min) 
        return; 
    }
    
    // find largest margin which would be first in the list and in the given range
    var newMargin : number;

    for(var i = sortedOfferValues.length-1; i > 0; i--)
      if(sortedOfferValues[i-1] < marginMin)
      newMargin = sortedOfferValues[i];
    
      newMargin = Math.max(marginMin, newMargin - 0.01);

    // apply new margin to matched offer
    var update_result = await api.rates.update(element.offer_id, newMargin)
    let success : boolean = update_result.data.success;

    /////////////////////
    // SPĖJIMAS: offer_id === offer_hash
    /////////////////////

    if(!success) {
      console.error("Offer update unsuccessful: API error");
      return -1;
    } else
      return newMargin;
  }

  return -1;
}