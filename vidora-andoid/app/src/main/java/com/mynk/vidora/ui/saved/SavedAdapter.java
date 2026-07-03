package com.mynk.vidora.ui.saved;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.mynk.vidora.R;
import com.mynk.vidora.utils.BookmarkManager;

import java.util.List;

public class SavedAdapter extends RecyclerView.Adapter<SavedAdapter.ViewHolder> {

    public interface OnItemClickListener {
        void onClick(BookmarkManager.BookmarkItem item);
    }

    private List<BookmarkManager.BookmarkItem> items;
    private final OnItemClickListener listener;

    public SavedAdapter(List<BookmarkManager.BookmarkItem> items, OnItemClickListener listener) {
        this.items = items;
        this.listener = listener;
    }

    public void updateItems(List<BookmarkManager.BookmarkItem> newItems) {
        this.items = newItems;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_history, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        BookmarkManager.BookmarkItem item = items.get(position);
        holder.name.setText(item.name != null ? item.name : "Untitled");
        holder.meta.setText(item.type != null ? item.type : "file");
        holder.itemView.setOnClickListener(v -> listener.onClick(item));
    }

    @Override
    public int getItemCount() {
        return items != null ? items.size() : 0;
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView name, meta;

        ViewHolder(View itemView) {
            super(itemView);
            name = itemView.findViewById(R.id.tv_history_name);
            meta = itemView.findViewById(R.id.tv_history_meta);
        }
    }
}
