package fyi.openpkx.pkhemu

import android.app.Activity
import android.os.Build
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClient.BillingResponseCode
import com.android.billingclient.api.BillingClient.ProductType
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams

@InvokeArg
class ProductsArgs {
  var ids: List<String> = emptyList()
}

@InvokeArg
class BuyArgs {
  lateinit var id: String
}

@TauriPlugin
class PurchasesPlugin(private val activity: Activity) : Plugin(activity), PurchasesUpdatedListener {
  private val client by lazy {
    BillingClient.newBuilder(activity)
      .setListener(this)
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
      .build()
  }
  private val connecting = mutableListOf<(BillingResult) -> Unit>()
  @Volatile private var buying: Invoke? = null

  // Play only sells to a copy it installed, so a sideloaded one reports Plus as unavailable.
  private val fromPlay: Boolean
    get() {
      val packages = activity.packageManager
      val installer = if (Build.VERSION.SDK_INT >= 30) {
        packages.getInstallSourceInfo(activity.packageName).installingPackageName
      } else {
        @Suppress("DEPRECATION") packages.getInstallerPackageName(activity.packageName)
      }
      return installer == "com.android.vending"
    }

  @Command
  fun products(invoke: Invoke) {
    val args = invoke.parseArgs(ProductsArgs::class.java)
    val none = JSObject().put("products", JSArray())
    if (!fromPlay || args.ids.isEmpty()) return invoke.resolve(none)
    details(args.ids, { invoke.resolve(none) }, { invoke.reject(message(it)) }) { found ->
      val products = JSArray()
      for (product in found) {
        val offer = product.oneTimePurchaseOfferDetails ?: continue
        products.put(JSObject().put("id", product.productId).put("price", offer.formattedPrice))
      }
      invoke.resolve(JSObject().put("products", products))
    }
  }

  @Command
  fun buy(invoke: Invoke) {
    val args = invoke.parseArgs(BuyArgs::class.java)
    if (!fromPlay) return invoke.reject(UNAVAILABLE)
    synchronized(this) {
      if (buying != null) return invoke.reject("A purchase is already open")
      buying = invoke
    }
    val give = { reason: String ->
      buying = null
      invoke.reject(reason)
    }
    details(listOf(args.id), { give(UNAVAILABLE) }, { give(message(it)) }) { found ->
      val product = found.firstOrNull { it.productId == args.id } ?: return@details give(UNAVAILABLE)
      val offer = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).build()
      val flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(offer)).build()
      activity.runOnUiThread {
        val launched = client.launchBillingFlow(activity, flow)
        if (launched.responseCode != BillingResponseCode.OK) onPurchasesUpdated(launched, null)
      }
    }
  }

  override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
    val outcome = when (result.responseCode) {
      BillingResponseCode.OK ->
        if (purchases.orEmpty().any { it.purchaseState == Purchase.PurchaseState.PURCHASED }) "purchased" else "pending"
      BillingResponseCode.ITEM_ALREADY_OWNED -> "purchased"
      BillingResponseCode.USER_CANCELED -> "cancelled"
      else -> null
    }
    val invoke = synchronized(this) { buying.also { buying = null } }
    when {
      invoke == null -> if (result.responseCode == BillingResponseCode.OK) trigger("updated", JSObject())
      outcome == null -> invoke.reject(message(result))
      else -> invoke.resolve(JSObject().put("result", outcome))
    }
  }

  @Command
  fun owned(invoke: Invoke) {
    val unavailable = JSObject().put("available", false)
    if (!fromPlay) return invoke.resolve(unavailable)
    connected({ invoke.resolve(unavailable) }, { invoke.reject(message(it)) }) {
      val params = QueryPurchasesParams.newBuilder().setProductType(ProductType.INAPP).build()
      client.queryPurchasesAsync(params) { result, purchases ->
        when {
          result.responseCode == BillingResponseCode.OK -> {
            val purchased = purchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
            acknowledge(purchased.filter { !it.isAcknowledged }) {
              val products = JSArray()
              purchased.flatMap { it.products }.distinct().forEach { products.put(it) }
              invoke.resolve(JSObject().put("available", true).put("products", products))
            }
          }
          unavailable(result) -> invoke.resolve(unavailable)
          else -> invoke.reject(message(result))
        }
      }
    }
  }

  // Play refunds a purchase nobody acknowledges within 3 days. A failure here is retried on the next check.
  private fun acknowledge(purchases: List<Purchase>, done: () -> Unit) {
    val purchase = purchases.firstOrNull() ?: return done()
    val params = AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()
    client.acknowledgePurchase(params) { result ->
      if (result.responseCode != BillingResponseCode.OK) Log.w(TAG, "acknowledging a purchase: ${message(result)}")
      acknowledge(purchases.drop(1), done)
    }
  }

  private fun details(
    ids: List<String>,
    onUnavailable: () -> Unit,
    onFailed: (BillingResult) -> Unit,
    then: (List<ProductDetails>) -> Unit,
  ) = connected(onUnavailable, onFailed) {
    val products = ids.map {
      QueryProductDetailsParams.Product.newBuilder().setProductId(it).setProductType(ProductType.INAPP).build()
    }
    val params = QueryProductDetailsParams.newBuilder().setProductList(products).build()
    client.queryProductDetailsAsync(params) { result, found ->
      when {
        result.responseCode == BillingResponseCode.OK -> then(found.productDetailsList)
        unavailable(result) -> onUnavailable()
        else -> onFailed(result)
      }
    }
  }

  private fun connected(onUnavailable: () -> Unit, onFailed: (BillingResult) -> Unit, then: () -> Unit) {
    val ready: (BillingResult) -> Unit = { result ->
      when {
        result.responseCode == BillingResponseCode.OK -> then()
        unavailable(result) -> onUnavailable()
        else -> onFailed(result)
      }
    }
    if (client.isReady) return then()
    synchronized(connecting) {
      connecting.add(ready)
      if (connecting.size > 1) return
    }
    client.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(result: BillingResult) {
        val waiting = synchronized(connecting) { connecting.toList().also { connecting.clear() } }
        waiting.forEach { it(result) }
      }

      override fun onBillingServiceDisconnected() {
        onBillingSetupFinished(
          BillingResult.newBuilder()
            .setResponseCode(BillingResponseCode.SERVICE_DISCONNECTED)
            .setDebugMessage("Google Play disconnected")
            .build(),
        )
      }
    })
  }

  private fun unavailable(result: BillingResult) =
    result.responseCode == BillingResponseCode.BILLING_UNAVAILABLE ||
      result.responseCode == BillingResponseCode.FEATURE_NOT_SUPPORTED ||
      result.responseCode == BillingResponseCode.ITEM_UNAVAILABLE

  private fun message(result: BillingResult) =
    result.debugMessage.ifEmpty { "Google Play answered ${result.responseCode}" }

  private companion object {
    const val TAG = "PurchasesPlugin"
    const val UNAVAILABLE = "Plus can't be bought on this device"
  }
}
